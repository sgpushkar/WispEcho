"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { getSocket, disconnectSocket } from "@/lib/socket";

export function useSocketEvents() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { addMessage, updateMessage, removeMessage, setTyping, setPresence } = useChatStore();

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    socket.on("message:new", (msg) => addMessage(msg));
    socket.on("message:edited", (msg) => updateMessage(msg));
    socket.on("message:deleted", ({ id, conversationId }) => removeMessage(conversationId, id));

    socket.on("typing:start", ({ conversationId, userId }) => setTyping(conversationId, userId, true));
    socket.on("typing:stop", ({ conversationId, userId }) => setTyping(conversationId, userId, false));

    socket.on("presence:update", ({ userId, isOnline }) => setPresence(userId, isOnline));

    return () => {
      socket.off("message:new");
      socket.off("message:edited");
      socket.off("message:deleted");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("presence:update");
    };
  }, [accessToken]);

  useEffect(() => {
    return () => {
      if (!useAuthStore.getState().accessToken) disconnectSocket();
    };
  }, []);
}
