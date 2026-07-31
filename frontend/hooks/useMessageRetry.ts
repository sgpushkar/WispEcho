import { useCallback } from "react";
import { useChatStore, Message } from "@/store/useChatStore";
import { api } from "@/lib/api";

export function useMessageRetry() {
  const retryMessage = useCallback(async (conversationId: string, tempId: string) => {
    const messages = useChatStore.getState().messages[conversationId] || [];
    const messageToRetry = messages.find((m) => m.id === tempId || m.tempId === tempId);
    
    if (!messageToRetry) return;

    // Set status back to sending
    useChatStore.getState().setMessageStatus(conversationId, tempId, "sending");

    try {
      const res = await api.post("/messages", { 
        conversationId, 
        content: messageToRetry.content, 
        type: messageToRetry.type, 
        mediaUrl: messageToRetry.mediaUrl, 
        replyToId: messageToRetry.replyTo?.id, 
        isViewOnce: messageToRetry.isViewOnce 
      });
      useChatStore.getState().replaceOptimisticMessage(conversationId, tempId, res.data.message);
    } catch (err) {
      console.error("Failed to retry message", err);
      useChatStore.getState().setMessageStatus(conversationId, tempId, "failed");
    }
  }, []);

  const deleteFailedMessage = useCallback((conversationId: string, tempId: string) => {
    const messages = useChatStore.getState().messages[conversationId] || [];
    const updatedMessages = messages.filter(m => m.id !== tempId && m.tempId !== tempId);
    useChatStore.getState().setMessages(conversationId, updatedMessages);
  }, []);

  return { retryMessage, deleteFailedMessage };
}
