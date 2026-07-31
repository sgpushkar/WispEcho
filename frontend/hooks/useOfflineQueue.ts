import { useEffect, useCallback } from "react";
import { useChatStore, Message } from "@/store/useChatStore";
import { api } from "@/lib/api";

const DB_NAME = "wispecho-offline-queue";
const STORE_NAME = "messages";
const DB_VERSION = 1;

interface QueuedMessage {
  tempId: string;
  conversationId: string;
  content: string | null;
  type: string;
  mediaUrl: string | null;
  replyToId: string | null;
  isViewOnce?: boolean;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "tempId" });
      }
    };
  });
}

async function enqueueToDB(message: QueuedMessage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(message);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dequeueAllFromDB(): Promise<QueuedMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const messages = request.result as QueuedMessage[];
      messages.sort((a, b) => a.timestamp - b.timestamp);
      resolve(messages);
    };
    request.onerror = () => reject(request.error);
  });
}

async function removeFromDB(tempId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(tempId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useOfflineQueue() {
  const isOffline = useChatStore((s) => s.isOffline);

  const enqueue = useCallback(async (
    tempId: string, 
    conversationId: string, 
    content: string | null, 
    type: string, 
    mediaUrl: string | null, 
    replyToId: string | null, 
    isViewOnce?: boolean
  ) => {
    await enqueueToDB({
      tempId,
      conversationId,
      content,
      type,
      mediaUrl,
      replyToId,
      isViewOnce,
      timestamp: Date.now(),
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (isOffline) return;
    
    try {
      const queuedMessages = await dequeueAllFromDB();
      if (queuedMessages.length === 0) return;
      
      for (const msg of queuedMessages) {
        try {
          const res = await api.post("/messages", {
            conversationId: msg.conversationId,
            content: msg.content,
            type: msg.type,
            mediaUrl: msg.mediaUrl,
            replyToId: msg.replyToId,
            isViewOnce: msg.isViewOnce
          });
          useChatStore.getState().replaceOptimisticMessage(msg.conversationId, msg.tempId, res.data.message);
          await removeFromDB(msg.tempId);
        } catch (err) {
          console.error("Failed to process queued message:", err);
          useChatStore.getState().setMessageStatus(msg.conversationId, msg.tempId, "failed");
        }
      }
    } catch (err) {
      console.error("Error processing offline queue:", err);
    }
  }, [isOffline]);

  // Handle online/offline events globally
  useEffect(() => {
    const handleOnline = () => {
      useChatStore.getState().setOffline(false);
      processQueue();
    };
    
    const handleOffline = () => {
      useChatStore.getState().setOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Initial check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      handleOffline();
    } else {
      processQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processQueue]);

  return { enqueue, processQueue };
}
