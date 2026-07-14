import prisma from "../config/db.js";
import { sendMessageSchema } from "../utils/validators.js";
import { emitToConversation, notifyUser } from "../sockets/index.js";

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
      where: { 
        conversationId,
        NOT: { deletedByIds: { has: req.userId } }
      },
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

    // Extract mentions and notify users
    if (data.content) {
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const matches = [...data.content.matchAll(mentionRegex)];
      if (matches.length > 0) {
        const usernames = matches.map(m => m[1]);
        const mentionedUsers = await prisma.user.findMany({
          where: { username: { in: usernames } },
          select: { id: true, username: true }
        });
        
        mentionedUsers.forEach(user => {
          if (user.id !== req.userId) {
            // Check if they are in the conversation
            prisma.conversationParticipant.findUnique({
              where: { conversationId_userId: { conversationId, userId: user.id } }
            }).then(participant => {
              if (participant) {
                notifyUser(user.id, "notification:mention", {
                  conversationId,
                  message: `${message.sender.displayName} mentioned you: ${data.content}`
                });
              }
            });
          }
        });
      }
    }

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
    if (!existing) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (forEveryone) {
      if (existing.senderId !== req.userId) {
        return res.status(403).json({ error: "Cannot delete others' messages for everyone" });
      }
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true, content: null, mediaUrl: null },
      });
      emitToConversation(existing.conversationId, "message:deleted", { id: messageId, forEveryone: true });
      return res.json({ message });
    } else {
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { deletedByIds: { push: req.userId } },
      });
      res.json({ success: true, forMe: true });
    }
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

export async function togglePinChat(req, res, next) {
  try {
    const { conversationId } = req.params;
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } }
    });
    if (!participant) return res.status(404).json({ error: "Conversation not found" });

    const updated = await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
      data: { isPinned: !participant.isPinned },
    });
    res.json({ isPinned: updated.isPinned });
  } catch (err) {
    next(err);
  }
}

export async function toggleSaveMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    const existing = await prisma.savedMessage.findUnique({
      where: { userId_messageId: { userId: req.userId, messageId } }
    });
    if (existing) {
      await prisma.savedMessage.delete({ where: { id: existing.id } });
      return res.json({ saved: false });
    }
    await prisma.savedMessage.create({
      data: { userId: req.userId, messageId }
    });
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
}

export async function searchMessages(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) return res.json({ messages: [] });

    const messages = await prisma.message.findMany({
      where: {
        content: { contains: q, mode: "insensitive" },
        conversation: { participants: { some: { userId: req.userId } } },
        isDeleted: false,
        NOT: { deletedByIds: { has: req.userId } }
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        conversation: { include: { group: true, participants: { include: { user: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
}
