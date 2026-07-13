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
    participants.forEach((p) => socket.join(`conversation:${p.conversationId}`));

    socket.on("conversation:join", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
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
        userSocketMap.delete(userId);
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeen: new Date() },
        });
        broadcastPresence(userId, false);
      }
    });
  });
}

function broadcastPresence(userId, isOnline) {
  ioInstance?.emit("presence:update", { userId, isOnline, lastSeen: new Date() });
}

export function emitToConversation(conversationId, event, payload) {
  ioInstance?.to(`conversation:${conversationId}`).emit(event, payload);
}

export function notifyUser(userId, event, payload) {
  const sockets = userSocketMap.get(userId);
  if (!sockets) return;
  sockets.forEach((socketId) => ioInstance?.to(socketId).emit(event, payload));
}
