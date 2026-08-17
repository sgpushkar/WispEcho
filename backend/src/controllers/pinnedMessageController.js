import prisma from "../config/db.js";
import { emitToConversation } from "../sockets/index.js";

/** POST /api/messages/conversations/:conversationId/pin/:messageId */
export async function pinMessage(req, res, next) {
  try {
    const { conversationId, messageId } = req.params;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) {
      return res.status(404).json({ error: "Message not found in this conversation" });
    }

    const pinned = await prisma.pinnedMessage.upsert({
      where: { conversationId_messageId: { conversationId, messageId } },
      create: { conversationId, messageId, pinnedById: req.userId },
      update: { pinnedById: req.userId, pinnedAt: new Date() },
      include: { message: { include: { sender: { select: { id: true, displayName: true } } } } },
    });

    emitToConversation(conversationId, "message:pinned", { conversationId, pinned });
    res.status(201).json({ pinned });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/messages/conversations/:conversationId/pin/:messageId */
export async function unpinMessage(req, res, next) {
  try {
    const { conversationId, messageId } = req.params;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    await prisma.pinnedMessage.deleteMany({ where: { conversationId, messageId } });

    emitToConversation(conversationId, "message:unpinned", { conversationId, messageId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/conversations/:conversationId/pins */
export async function getPinnedMessages(req, res, next) {
  try {
    const { conversationId } = req.params;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    const pins = await prisma.pinnedMessage.findMany({
      where: { conversationId },
      orderBy: { pinnedAt: "desc" },
      include: {
        message: {
          include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        },
        pinnedBy: { select: { id: true, displayName: true } },
      },
    });

    res.json({ pins });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/messages/bulk */
export async function bulkDeleteMessages(req, res, next) {
  try {
    const { messageIds, forEveryone } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: "messageIds must be a non-empty array" });
    }

    const messages = await prisma.message.findMany({
      where: { id: { in: messageIds } },
    });

    for (const msg of messages) {
      if (forEveryone) {
        if (msg.senderId !== req.userId) {
          return res.status(403).json({ error: `Cannot delete message ${msg.id} for everyone — not your message` });
        }
      }
    }

    if (forEveryone) {
      await prisma.message.updateMany({
        where: { id: { in: messageIds }, senderId: req.userId },
        data: { isDeleted: true, content: null, mediaUrl: null },
      });
      // Emit per conversation
      const byConv = messages.reduce((acc, m) => {
        (acc[m.conversationId] = acc[m.conversationId] || []).push(m.id);
        return acc;
      }, {});
      for (const [convId, ids] of Object.entries(byConv)) {
        ids.forEach((id) =>
          emitToConversation(convId, "message:deleted", { id, conversationId: convId, forEveryone: true })
        );
      }
    } else {
      await prisma.message.updateMany({
        where: { id: { in: messageIds } },
        data: { deletedByIds: { push: req.userId } },
      });
    }

    res.json({ success: true, count: messageIds.length });
  } catch (err) {
    next(err);
  }
}
