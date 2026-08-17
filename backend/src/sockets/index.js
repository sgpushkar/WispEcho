import { verifyAccessToken } from "../utils/token.js";
import prisma from "../config/db.js";

let ioInstance = null;
const userSocketMap = new Map(); // userId -> Set<socketId>

export function initSockets(io) {
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId } = socket;

    if (!userSocketMap.has(userId)) userSocketMap.set(userId, new Set());
    userSocketMap.get(userId).add(socket.id);

    await prisma.user.update({ where: { id: userId }, data: { isOnline: true } });
    broadcastPresence(userId, true);

    // join a room per conversation the user is part of
    const participants = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    
    const conversationIds = participants.map((p) => p.conversationId);
    conversationIds.forEach((id) => socket.join(`conversation:${id}`));

    // Mark pending messages as delivered
    if (conversationIds.length > 0) {
      const deliveredMessages = await prisma.message.findMany({
        where: {
          conversationId: { in: conversationIds },
          senderId: { not: userId },
          status: "SENT",
        },
        select: { id: true, conversationId: true }
      });

      if (deliveredMessages.length > 0) {
        await prisma.message.updateMany({
          where: { id: { in: deliveredMessages.map(m => m.id) } },
          data: { status: "DELIVERED" }
        });

        // Group by conversation to emit events efficiently
        const byConv = deliveredMessages.reduce((acc, msg) => {
          if (!acc[msg.conversationId]) acc[msg.conversationId] = [];
          acc[msg.conversationId].push(msg.id);
          return acc;
        }, {});

        for (const [convId, msgIds] of Object.entries(byConv)) {
          msgIds.forEach(id => {
            emitToConversation(convId, "message:delivered", { conversationId: convId, messageId: id, userId });
          });
        }
      }
    }

    // Bug #3 fix: verify the user is actually a participant before joining the room
    socket.on("conversation:join", async (conversationId) => {
      try {
        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (participant) {
          socket.join(`conversation:${conversationId}`);
        }
      } catch (err) {
        console.error("conversation:join error", err);
      }
    });

    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:start", { conversationId, userId });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:stop", { conversationId, userId });
    });

    socket.on("disconnect", async () => {
      const sockets = userSocketMap.get(userId);
      sockets?.delete(socket.id);

      if (!sockets || sockets.size === 0) {
        // Wait briefly to see if they reconnect (e.g. page refresh)
        setTimeout(async () => {
          const currentSockets = userSocketMap.get(userId);
          if (!currentSockets || currentSockets.size === 0) {
            userSocketMap.delete(userId);
            try {
              await prisma.user.update({
                where: { id: userId },
                data: { isOnline: false, lastSeen: new Date() },
              });
              broadcastPresence(userId, false);
            } catch (err) {
              console.error("Failed to update presence", err);
            }
          }
        }, 2000);
      }
    });
  });
}

/**
 * Bug #6 fix: instead of broadcasting to ALL sockets (privacy violation),
 * emit presence only to sockets of users who share a conversation with this user.
 */
async function broadcastPresence(userId, isOnline) {
  try {
    // Find all users who share at least one conversation with this user
    const sharedParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: {
          in: (
            await prisma.conversationParticipant.findMany({
              where: { userId },
              select: { conversationId: true },
            })
          ).map((p) => p.conversationId),
        },
        userId: { not: userId },
      },
      select: { userId: true },
    });

    const contactIds = [...new Set(sharedParticipants.map((p) => p.userId))];
    const payload = { userId, isOnline, lastSeen: new Date() };

    for (const contactId of contactIds) {
      notifyUser(contactId, "presence:update", payload);
    }
  } catch (err) {
    console.error("broadcastPresence error", err);
  }
}

export function emitToConversation(conversationId, event, payload) {
  ioInstance?.to(`conversation:${conversationId}`).emit(event, payload);
}

export function notifyUser(userId, event, payload) {
  const sockets = userSocketMap.get(userId);
  if (!sockets) return;
  sockets.forEach((socketId) => ioInstance?.to(socketId).emit(event, payload));
}
