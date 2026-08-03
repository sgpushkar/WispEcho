"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useChatStore } from "@/store/useChatStore";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";

// Simple helper to play a beep sound using Web Audio API
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Slide up to A6
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
}

export function useSocketEvents() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id;
  const { addMessage, updateMessage, removeMessage, setTyping, setPresence, addReaction, removeReaction, activeConversationId, removeConversation } = useChatStore();
  const { sendNotification } = useNotifications();
  const activeConvRef = useRef(activeConversationId);
  const queryClient = useQueryClient();

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    socket.on("message:new", (msg) => {
      addMessage(msg);
      
      if (user && msg.senderId !== user.id) {
        if (typeof document !== "undefined" && (activeConvRef.current !== msg.conversationId || document.hidden)) {
          playNotificationSound();
          const senderName = msg.sender?.displayName || "Someone";
          const text =
            msg.type === "IMAGE" ? "📷 Sent a photo" :
            msg.type === "VOICE" ? "🎤 Sent a voice note" :
            msg.type === "FILE"  ? "📎 Sent a file" :
            msg.content || "New message";
          sendNotification(`New message from ${senderName}`, text);
        }
      }
    });

    socket.on("message:viewed", (data) => {
      useChatStore.getState().markMessageViewed(data.conversationId, data.messageId, data.userId);
    });
    
    socket.on("message:delivered", (data) => {
      useChatStore.getState().setMessageStatus(data.conversationId, data.messageId, "delivered");
    });
    
    socket.on("message:read", (data) => {
      useChatStore.getState().setMessageStatus(data.conversationId, data.messageId, "read");
    });

    socket.on("message:edited", (msg) => updateMessage(msg));
    socket.on("message:deleted", ({ id, conversationId }) => removeMessage(conversationId, id));
    socket.on("reaction:added", (reaction) => addReaction(reaction));
    socket.on("reaction:removed", (payload) => removeReaction(payload));

    socket.on("typing:start", ({ conversationId, userId }) => setTyping(conversationId, userId, true));
    socket.on("typing:stop", ({ conversationId, userId }) => setTyping(conversationId, userId, false));

    socket.on("presence:update", ({ userId, isOnline }) => setPresence(userId, isOnline));
    
    socket.on("conversation:read", ({ conversationId, userId }) => {
      // You can implement updating read receipts in the store here if needed
      // Currently, we don't have a specific store action for read receipts
    });

    socket.on("notification:mention", (payload) => {
      playNotificationSound();
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`You were mentioned!`, {
          body: payload.message,
          icon: "/logo.png"
        });
      }
    });

    socket.on("group:memberLeft", ({ conversationId, userId: leftUserId }) => {
      if (leftUserId === currentUserId) {
        // Current user left — remove from sidebar
        useChatStore.getState().removeConversation(conversationId);
      } else {
        // Someone else left — refresh group data
        queryClient.invalidateQueries({ queryKey: ["group"] });
      }
    });

    socket.on("group:deleted", ({ conversationId }) => {
      useChatStore.getState().removeConversation(conversationId);
    });

    socket.on("connect", () => {
      useChatStore.getState().setOffline(false);
      // Invalidate queries to trigger background sync of conversations/messages
      queryClient.invalidateQueries();
    });

    socket.on("disconnect", () => {
      useChatStore.getState().setOffline(true);
    });

    return () => {
      socket.off("message:new");
      socket.off("message:viewed");
      socket.off("message:delivered");
      socket.off("message:read");
      socket.off("message:edited");
      socket.off("message:deleted");
      socket.off("reaction:added");
      socket.off("reaction:removed");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("presence:update");
      socket.off("conversation:read");
      socket.off("notification:mention");
      socket.off("group:memberLeft");
      socket.off("group:deleted");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [accessToken, currentUserId]);

  useEffect(() => {
    return () => {
      if (!useAuthStore.getState().accessToken) disconnectSocket();
    };
  }, []);
}
