import prisma from "../config/db.js";
import { sendMessageSchema } from "../utils/validators.js";
import { emitToConversation, notifyUser } from "../sockets/index.js";
import { sendPushNotification } from "../services/pushService.js";
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
        disappearAfter: conv.disappearAfter || "OFF",
        participants: conv.participants.map(cp => ({
          userId: cp.userId,
          chatBg: cp.chatBg,
          user: {
            id: cp.user.id,
            username: cp.user.username,
            displayName: cp.user.displayName,
            avatarUrl: cp.user.avatarUrl,
          }
        })),
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

const conversationCreationLocks = new Set();

async function getOrCreateDirect(userIdA, userIdB) {
  const lockKey = [userIdA, userIdB].sort().join("-");
  
  if (conversationCreationLocks.has(lockKey)) {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 50));
      if (!conversationCreationLocks.has(lockKey)) break;
    }
  }

  let conv = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId: userIdA } } },
        { participants: { some: { userId: userIdB } } },
      ],
    },
  });

  if (conv) return conv;

  conversationCreationLocks.add(lockKey);
  try {
    // re-check after acquiring lock
    conv = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: userIdA } } },
          { participants: { some: { userId: userIdB } } },
        ],
      },
    });

    if (conv) return conv;

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: userIdA, addresseeId: userIdB },
          { requesterId: userIdB, addresseeId: userIdA },
        ],
      },
    });

    if (!friendship) {
      const err = new Error("Cannot message this user. You are not friends or are blocked.");
      err.status = 403;
      throw err;
    }

    conv = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId: userIdA }, { userId: userIdB }],
        },
      },
    });

    return conv;
  } finally {
    conversationCreationLocks.delete(lockKey);
  }
}

export async function getOrCreateDirectConversation(req, res, next) {
  try {
    const { userId: otherUserId } = req.params;
    const conversation = await getOrCreateDirect(req.userId, otherUserId);
    res.status(201).json({ conversation });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params;

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
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reactions: true,
        replyTo: { include: { sender: { select: { username: true, displayName: true } } } },
        poll: { include: { votes: true } },
      },
    });

    // Strip raw Cloudinary URLs from IMAGE messages — clients always fetch via the proxy.
    // Voice notes (VOICE type) keep their mediaUrl since they use direct Cloudinary delivery.
    const sanitized = messages.map((msg) => {
      let pollFormatted = null;
      if (msg.poll) {
        const options = Array.isArray(msg.poll.options)
          ? msg.poll.options
          : JSON.parse(JSON.stringify(msg.poll.options || []));
        const votes = msg.poll.votes || [];
        const results = options.map((label, idx) => {
          const matching = votes.filter((v) => Array.isArray(v.optionIndexes) && v.optionIndexes.includes(idx));
          return {
            index: idx,
            label,
            votes: matching.length,
            voters: matching.map((v) => v.userId),
          };
        });
        const myVote = votes.find((v) => v.userId === req.userId);
        pollFormatted = {
          id: msg.poll.id,
          messageId: msg.poll.messageId,
          question: msg.poll.question,
          options,
          allowMultiple: msg.poll.allowMultiple,
          endsAt: msg.poll.endsAt,
          closedAt: msg.poll.closedAt,
          results,
          myVote: myVote?.optionIndexes ?? null,
          totalVotes: votes.length,
        };
      }

      if (msg.type === "IMAGE") {
        return { ...msg, mediaUrl: null, mediaPublicId: null, poll: pollFormatted };
      }
      return { ...msg, poll: pollFormatted };
    });

    res.json({ messages: sanitized.reverse() });
  } catch (err) {
    next(err);
  }
}

export async function getSharedMedia(req, res, next) {
  try {
    const { conversationId } = req.params;

    const isParticipant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!isParticipant) return res.status(403).json({ error: "Not a participant" });

    const messages = await prisma.message.findMany({
      where: { 
        conversationId,
        mediaUrl: { not: null },
        NOT: { deletedByIds: { has: req.userId } }
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        mediaUrl: true,
        type: true,
        createdAt: true,
      }
    });

    // Strip raw Cloudinary URLs from IMAGE messages
    const sanitized = messages.map((msg) => {
      if (msg.type === "IMAGE") {
        return { ...msg, mediaUrl: null };
      }
      return msg;
    });

    res.json({ media: sanitized });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const data = sendMessageSchema.parse(req.body);
    let conversationId = data.conversationId;

    if (!conversationId && data.recipientId) {
      try {
        const conv = await getOrCreateDirect(req.userId, data.recipientId);
        conversationId = conv.id;
      } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        throw err;
      }
    }

    if (!conversationId) return res.status(400).json({ error: "conversationId or recipientId required" });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { select: { userId: true, isMuted: true } },
        group: { select: { name: true } },
      },
    });

    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const isParticipant = conversation.participants.some(p => p.userId === req.userId);
    if (!isParticipant) return res.status(403).json({ error: "Not a participant" });

    // Calculate disappearsAt
    let disappearsAt = null;
    if (conversation.disappearAfter && conversation.disappearAfter !== "OFF") {
      const now = data.scheduledAt ? new Date(data.scheduledAt) : new Date();
      if (conversation.disappearAfter === "H24") disappearsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      else if (conversation.disappearAfter === "D7") disappearsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      else if (conversation.disappearAfter === "D30") disappearsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const pollCreate = data.type === "POLL" && Array.isArray(req.body.pollOptions) && req.body.pollOptions.length >= 2
      ? {
          create: {
            conversationId,
            createdById: req.userId,
            question: data.content || "Poll",
            options: req.body.pollOptions,
          }
        }
      : undefined;

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.userId,
        type: data.type,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaPublicId: data.mediaPublicId ?? null,
        replyToId: data.replyToId,
        isViewOnce: data.isViewOnce,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        disappearsAt,
        ...(pollCreate ? { poll: pollCreate } : {}),
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        replyTo: true,
        poll: { include: { votes: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    let pollFormatted = null;
    if (message.poll) {
      const options = Array.isArray(message.poll.options) ? message.poll.options : JSON.parse(JSON.stringify(message.poll.options || []));
      const votes = message.poll.votes || [];
      const results = options.map((label, idx) => {
        const matching = votes.filter((v) => Array.isArray(v.optionIndexes) && v.optionIndexes.includes(idx));
        return {
          index: idx,
          label,
          votes: matching.length,
          voters: matching.map((v) => v.userId),
        };
      });
      pollFormatted = {
        id: message.poll.id,
        messageId: message.poll.messageId,
        question: message.poll.question,
        options,
        allowMultiple: message.poll.allowMultiple,
        endsAt: message.poll.endsAt,
        closedAt: message.poll.closedAt,
        results,
        myVote: null,
        totalVotes: votes.length,
      };
    }

    // Strip raw mediaUrl before emitting over socket
    const messageForSocket = {
      ...(message.type === "IMAGE" ? { ...message, mediaUrl: null, mediaPublicId: null } : message),
      poll: pollFormatted,
    };

    // Only emit and push notify if it's NOT a scheduled message
    if (!data.scheduledAt) {
      emitToConversation(conversationId, "message:new", messageForSocket);

      // Extract mentions and notify users
      if (data.content) {
        const mentionRegex = /@([a-zA-Z0-9_]+)/g;
        const matches = [...data.content.matchAll(mentionRegex)];
        if (matches.length > 0) {
          const usernames = matches.map(m => m[1]);
          const hasEveryone = usernames.includes("everyone") || usernames.includes("here");
          
          let usersToNotify = [];
          if (hasEveryone) {
            usersToNotify = conversation.participants.filter(p => p.userId !== req.userId).map(p => ({ id: p.userId }));
          } else {
            const mentionedUsers = await prisma.user.findMany({
              where: { username: { in: usernames } },
              select: { id: true, username: true }
            });
            usersToNotify = mentionedUsers.filter(u => 
              u.id !== req.userId && conversation.participants.some(p => p.userId === u.id)
            );
          }

          usersToNotify.forEach(user => {
            notifyUser(user.id, "notification:mention", {
              conversationId,
              message: `${message.sender.displayName} mentioned you: ${data.content}`
            });
          });
        }
      }

      // ── Background Web Push to offline participants ──
      for (const p of conversation.participants) {
        if (p.userId !== req.userId) {
          const title = conversation.isGroup && conversation.group
            ? `New message from ${message.sender.displayName} in ${conversation.group.name}`
            : `New message from ${message.sender.displayName}`;
            
          const pushData = {
            type: "NEW_MESSAGE",
            conversationId,
            messageId: message.id,
            title,
            body: data.content || (data.type === "IMAGE" ? "📷 Sent a photo" : "🎤 Sent a voice note"),
            actions: [
              { action: "reply", title: "Reply" },
              { action: "react", title: "👍 React" }
            ]
          };
          sendPushNotification(p.userId, pushData);
        }
      }
    }

    res.status(201).json({ message: messageForSocket });
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
    const forEveryone = req.body?.forEveryone ?? (req.query?.forEveryone === "true");

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
      emitToConversation(existing.conversationId, "message:deleted", { id: messageId, conversationId: existing.conversationId, forEveryone: true });
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
    
    // Update messages to READ
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: req.userId },
        status: { in: ["SENT", "DELIVERED"] }
      },
      select: { id: true }
    });

    if (unreadMessages.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadMessages.map(m => m.id) } },
        data: { status: "READ" }
      });

      unreadMessages.forEach(msg => {
        emitToConversation(conversationId, "message:read", { conversationId, messageId: msg.id, userId: req.userId });
      });
    }
    
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

export async function getSavedMessages(req, res, next) {
  try {
    const saved = await prisma.savedMessage.findMany({
      where: { userId: req.userId },
      orderBy: { savedAt: "desc" },
      include: {
        message: {
          include: {
            sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            conversation: {
              include: {
                group: { select: { name: true } },
                participants: { select: { user: { select: { id: true, username: true, displayName: true } } } },
              },
            },
          },
        },
      },
    });

    const messages = saved.map(({ savedAt, message }) => {
      // Strip raw Cloudinary URLs from IMAGE messages — same policy as getMessages
      const sanitized =
        message.type === "IMAGE"
          ? { ...message, mediaUrl: null, mediaPublicId: null }
          : message;
      return { ...sanitized, savedAt };
    });

    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

export async function toggleArchive(req, res, next) {
  try {
    const { conversationId } = req.params;
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(404).json({ error: "Conversation not found" });

    const updated = await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
      data: { isArchived: !participant.isArchived },
    });
    res.json({ isArchived: updated.isArchived });
  } catch (err) {
    next(err);
  }
}

export async function toggleFavorite(req, res, next) {
  try {
    const { conversationId } = req.params;
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(404).json({ error: "Conversation not found" });

    const updated = await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
      data: { isFavorite: !participant.isFavorite },
    });
    res.json({ isFavorite: updated.isFavorite });
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

export async function markViewOnce(req, res, next) {
  try {
    const { messageId } = req.params;
    const existing = await prisma.message.findUnique({ where: { id: messageId } });
    
    if (!existing || !existing.isViewOnce) {
      return res.status(404).json({ error: "Message not found or not view-once" });
    }

    // Senders can't "view" their own view-once (they sent it)
    if (existing.senderId === req.userId) {
      return res.status(400).json({ error: "Sender cannot mark own view-once as viewed" });
    }

    if (!existing.viewedByIds.includes(req.userId)) {
      const message = await prisma.message.update({
        where: { id: messageId },
        data: {
          viewedByIds: { push: req.userId },
          viewOnceOpenedAt: existing.viewOnceOpenedAt ?? new Date(),
        },
      });
      
      // Notify conversation that this user viewed the message
      emitToConversation(existing.conversationId, "message:viewed", { 
        messageId, 
        userId: req.userId,
        conversationId: existing.conversationId 
      });
      
      return res.json({ message });
    }
    
    res.json({ message: existing });
  } catch (err) {
    next(err);
  }
}

export async function updateParticipantSettings(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { chatBg } = req.body;

    const participant = await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
      data: { chatBg },
    });

    res.json({ participant });
  } catch (err) {
    next(err);
  }
}
