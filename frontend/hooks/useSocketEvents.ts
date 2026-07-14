"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { getSocket, disconnectSocket } from "@/lib/socket";

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
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { addMessage, updateMessage, removeMessage, setTyping, setPresence, addReaction, removeReaction, activeConversationId } = useChatStore();
  const activeConvRef = useRef(activeConversationId);

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
      
      // Check if it's not from us and not currently focused/active
      if (msg.senderId !== currentUserId) {
        if (activeConvRef.current !== msg.conversationId || document.hidden) {
          playNotificationSound();
          
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`New message from ${msg.sender.displayName}`, {
              body: msg.content || "Sent an attachment",
              icon: msg.sender.avatarUrl || "/logo.png"
            });
          }
        }
      }
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

    return () => {
      socket.off("message:new");
      socket.off("message:edited");
      socket.off("message:deleted");
      socket.off("reaction:added");
      socket.off("reaction:removed");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("presence:update");
      socket.off("conversation:read");
      socket.off("notification:mention");
    };
  }, [accessToken, currentUserId]);

  useEffect(() => {
    return () => {
      if (!useAuthStore.getState().accessToken) disconnectSocket();
    };
  }, []);
}
