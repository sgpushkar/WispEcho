import prisma from "../config/db.js";
import { emitToConversation } from "../sockets/index.js";
import { sendPushNotification } from "../services/pushService.js";

/**
 * POST /api/messages/:messageId/forward
 * Body: { targetConversationIds: string[] }
 */
export async function forwardMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    let targetConversationIds = req.body.targetConversationIds;

    // Handle single conversationId fallback from older clients or modal shortcuts
    if (!targetConversationIds && req.body.conversationId) {
      targetConversationIds = [req.body.conversationId];
    }

    if (!Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
      return res.status(400).json({ error: "targetConversationIds must be a non-empty array" });
    }

    const original = await prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    if (!original || original.isDeleted) {
      return res.status(404).json({ error: "Message not found" });
    }

    const forwarded = [];

    for (const conversationId of targetConversationIds) {
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: req.userId } },
      });
      if (!participant) continue;

      const msg = await prisma.message.create({
        data: {
          conversationId,
          senderId: req.userId,
          type: original.type,
          content: original.content,
          mediaUrl: original.mediaUrl,
          mediaPublicId: original.mediaPublicId,
          isForwarded: true,
          forwardedFromId: original.id,
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

      const msgForSocket = msg.type === "IMAGE" ? { ...msg, mediaUrl: null, mediaPublicId: null } : msg;
      emitToConversation(conversationId, "message:new", msgForSocket);

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: { select: { userId: true } }, group: { select: { name: true } } },
      });

      if (conversation) {
        for (const p of conversation.participants) {
          if (p.userId !== req.userId) {
            const title = conversation.isGroup && conversation.group
              ? `Forwarded message in ${conversation.group.name}`
              : `Forwarded message from ${msg.sender.displayName}`;
            sendPushNotification(p.userId, {
              type: "NEW_MESSAGE",
              conversationId,
              messageId: msg.id,
              title,
              body: original.content || "📨 Forwarded a message",
            });
          }
        }
      }

      forwarded.push(msgForSocket);
    }

    res.status(201).json({ forwarded, count: forwarded.length });
  } catch (err) {
    next(err);
  }
}
