import prisma from "../config/db.js";
import { sendMessageSchema } from "../utils/validators.js";
import { emitToConversation } from "../sockets/index.js";

// Get or create a 1:1 conversation, then list conversations for sidebar
export async function listConversations(req, res, next) {
  try {
    const participants = await prisma.conversationParticipant.findMany({
      where: { userId: req.userId },
      include: {
        conversation: {
          include: {
            group: true,
            participants: { include: { user: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    });

    const conversations = participants.map((p) => {
      const conv = p.conversation;
      const otherParticipant = conv.isGroup
        ? null
        : conv.participants.find((cp) => cp.userId !== req.userId)?.user;

      return {
        id: conv.id,
        isGroup: conv.isGroup,
        group: conv.group,
        otherUser: otherParticipant
          ? {
              id: otherParticipant.id,
              username: otherParticipant.username,
              displayName: otherParticipant.displayName,
              avatarUrl: otherParticipant.avatarUrl,
              isOnline: otherParticipant.isOnline,
              lastSeen: otherParticipant.lastSeen,
            }
          : null,
        lastMessage: conv.messages[0] || null,
        isPinned: p.isPinned,
        isArchived: p.isArchived,
        isFavorite: p.isFavorite,
        updatedAt: conv.updatedAt,
      };
    });

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

export async function getOrCreateDirectConversation(req, res, next) {
  try {
    const { userId: otherUserId } = req.params;

    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: req.userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
    });
    if (existing) return res.json({ conversation: existing });

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId: req.userId }, { userId: otherUserId }],
        },
      },
    });
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const cursor = req.query.cursor?.toString();
    const take = 30;

    const isParticipant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!isParticipant) return res.status(403).json({ error: "Not a participant" });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reactions: true,
        replyTo: { include: { sender: { select: { username: true, displayName: true } } } },
      },
    });

    res.json({ messages: messages.reverse(), nextCursor: messages.length === take ? messages[0]?.id : null });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const data = sendMessageSchema.parse(req.body);
    let conversationId = data.conversationId;

    if (!conversationId && data.recipientId) {
      let conv = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: req.userId } } },
            { participants: { some: { userId: data.recipientId } } },
          ],
        },
      });
      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            isGroup: false,
            participants: { create: [{ userId: req.userId }, { userId: data.recipientId }] },
          },
        });
      }
      conversationId = conv.id;
    }

    if (!conversationId) return res.status(400).json({ error: "conversationId or recipientId required" });

    const isParticipant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!isParticipant) return res.status(403).json({ error: "Not a participant" });

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.userId,
        type: data.type,
        content: data.content,
        mediaUrl: data.mediaUrl,
        replyToId: data.replyToId,
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        replyTo: true,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    emitToConversation(conversationId, "message:new", message);
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

export async function editMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const existing = await prisma.message.findUnique({ where: { id: messageId } });
    if (!existing || existing.senderId !== req.userId) {
      return res.status(403).json({ error: "Cannot edit this message" });
    }

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true },
    });

    emitToConversation(existing.conversationId, "message:edited", message);
    res.json({ message });
  } catch (err) {
    next(err);
  }
}

export async function deleteMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    const { forEveryone } = req.body;

    const existing = await prisma.message.findUnique({ where: { id: messageId } });
    if (!existing || existing.senderId !== req.userId) {
      return res.status(403).json({ error: "Cannot delete this message" });
    }

    if (forEveryone) {
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true, content: null, mediaUrl: null },
      });
      emitToConversation(existing.conversationId, "message:deleted", { id: messageId });
      return res.json({ message });
    }

    // "delete for me" would need a per-user hidden-message join table; kept minimal here
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function reactToMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: "Message not found" });

    const existing = await prisma.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: req.userId, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      emitToConversation(message.conversationId, "reaction:removed", { messageId, userId: req.userId, emoji });
      return res.json({ removed: true });
    }

    const reaction = await prisma.reaction.create({
      data: { messageId, userId: req.userId, emoji },
    });
    emitToConversation(message.conversationId, "reaction:added", reaction);
    res.status(201).json({ reaction });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const { conversationId } = req.params;
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
      data: { lastReadAt: new Date() },
    });
    emitToConversation(conversationId, "conversation:read", { conversationId, userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
