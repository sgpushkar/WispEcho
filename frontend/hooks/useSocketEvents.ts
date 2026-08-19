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
    // Bug #15 fix: close the AudioContext after playback to free browser resources
    osc.onended = () => ctx.close();
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
      // When another user marks a conversation as read, update the lastMessage
      // status so the sender sees the double-check read receipt.
      const state = useChatStore.getState();
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation?.lastMessage && conversation.lastMessage.senderId === currentUserId) {
        state.setMessageStatus(conversationId, conversation.lastMessage.id, "read");
      }
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

    // Bug #13 fix: handle members being added to a group
    socket.on("group:membersAdded", ({ groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });

    socket.on("group:deleted", ({ conversationId }) => {
      useChatStore.getState().removeConversation(conversationId);
    });

    // Feature v2 Socket Events
    socket.on("poll:updated", ({ pollId, poll }) => {
      queryClient.invalidateQueries({ queryKey: ["poll", pollId] });
      if (activeConvRef.current) {
        queryClient.invalidateQueries({ queryKey: ["messages", activeConvRef.current] });
        const allMsgs = useChatStore.getState().messages[activeConvRef.current] || [];
        const targetMsg = allMsgs.find(m => m.poll?.id === pollId || m.id === poll?.messageId);
        if (targetMsg) {
          useChatStore.getState().updateMessage({
            id: targetMsg.id,
            conversationId: activeConvRef.current,
            poll,
          });
        }
      }
    });

    socket.on("message:pinned", ({ conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["pinnedMessages", conversationId] });
    });

    socket.on("message:unpinned", ({ conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["pinnedMessages", conversationId] });
    });

    socket.on("group:joinRequest", ({ groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["groupJoinRequests", groupId] });
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Group Join Request", {
          body: "Someone requested to join your group",
          icon: "/logo.png"
        });
      }
    });

    socket.on("group:eventCreated", ({ event }) => {
      queryClient.invalidateQueries({ queryKey: ["groupEvents", event.groupId] });
    });

    socket.on("group:eventDeleted", ({ eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["groupEvents"] });
    });

    socket.on("conversation:disappearUpdated", ({ conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });

    socket.on("notification:broadcast", (payload) => {
      playNotificationSound();
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(payload.title || "Admin Broadcast", {
          body: payload.body,
          icon: "/logo.png"
        });
      }
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
      socket.off("group:membersAdded");
      socket.off("group:deleted");
      // v2
      socket.off("poll:updated");
      socket.off("message:pinned");
      socket.off("message:unpinned");
      socket.off("group:joinRequest");
      socket.off("group:eventCreated");
      socket.off("group:eventDeleted");
      socket.off("conversation:disappearUpdated");
      socket.off("notification:broadcast");

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
