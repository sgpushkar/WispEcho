import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface Message {
  id: string;
  tempId?: string;
  status?: MessageStatus;
  conversationId: string;
  senderId: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "VOICE" | "GIF";
  content: string | null;
  mediaUrl: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  isViewOnce?: boolean;
  viewedByIds?: string[];
  createdAt: string;
  sender: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  reactions?: { id: string; emoji: string; userId: string }[];
  replyTo?: Message | null;
  isPinned?: boolean;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  group?: { id: string; name: string; avatarUrl?: string | null; conversationId?: string } | null;
  participants?: { user: { id: string; username: string; displayName: string; avatarUrl?: string | null } }[];
  otherUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isOnline: boolean;
    lastSeen: string;
  } | null;
  lastMessage: Message | null;
  isPinned: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, Set<string>>; // conversationId -> userIds typing
  onlineUsers: Set<string>;
  isOffline: boolean;

  setConversations: (c: Conversation[]) => void;
  upsertConversation: (c: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  prependMessages: (conversationId: string, msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (msg: Partial<Message> & { id: string; conversationId: string }) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  togglePin: (conversationId: string) => void;
  toggleArchive: (conversationId: string) => void;
  toggleFavorite: (conversationId: string) => void;
  removeConversation: (conversationId: string) => void;
  addReaction: (reaction: { id: string; emoji: string; userId: string; messageId: string; conversationId?: string }) => void;
  removeReaction: (payload: { messageId: string; userId: string; emoji: string; conversationId?: string }) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setPresence: (userId: string, isOnline: boolean) => void;
  setOffline: (isOffline: boolean) => void;
  markMessageViewed: (conversationId: string, messageId: string, userId: string) => void;
  replaceOptimisticMessage: (conversationId: string, tempId: string, serverMessage: Message) => void;
  setMessageStatus: (conversationId: string, messageIdOrTempId: string, status: MessageStatus) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),
  isOffline: false,

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conv) =>
    set((state) => {
      const exists = state.conversations.find((c) => c.id === conv.id);
      const next = exists
        ? state.conversations.map((c) => (c.id === conv.id ? { ...c, ...conv } : c))
        : [conv, ...state.conversations];
      return { conversations: next.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)) };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, msgs) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      const pendingMessages = currentMessages.filter(m => m.status === "sending" || m.status === "failed");
      const merged = [...msgs, ...pendingMessages.filter(p => !msgs.some(m => m.id === p.id))];
      return { messages: { ...state.messages, [conversationId]: merged } };
    }),

  prependMessages: (conversationId, msgs) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...msgs, ...(state.messages[conversationId] || [])],
      },
    })),

  addMessage: (msg) =>
    set((state) => {
      const existing = state.messages[msg.conversationId] || [];
      // If the exact real ID already exists, skip
      if (existing.some((m) => m.id === msg.id)) return state;
      
      // If there's a pending optimistic message with this same real ID as tempId, replace it
      // This handles the race where socket fires before API response
      const hasPendingOptimistic = existing.some((m) => m.tempId === msg.id);
      let updatedList: Message[];
      if (hasPendingOptimistic) {
        updatedList = existing.map((m) =>
          m.tempId === msg.id ? { ...msg, status: "sent" as MessageStatus } : m
        );
      } else {
        updatedList = [...existing, msg];
      }

      const conv = state.conversations.find((c) => c.id === msg.conversationId);
      return {
        messages: { ...state.messages, [msg.conversationId]: updatedList },
        conversations: conv
          ? state.conversations
              .map((c) => (c.id === msg.conversationId ? { ...c, lastMessage: msg, updatedAt: msg.createdAt } : c))
              .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
          : state.conversations,
      };
    }),

  updateMessage: (partial) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [partial.conversationId]: (state.messages[partial.conversationId] || []).map((m) =>
          m.id === partial.id ? { ...m, ...partial } : m
        ),
      },
    })),

  removeMessage: (conversationId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: null, mediaUrl: null } : m
        ),
      },
    })),

  togglePin: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) => 
        c.id === conversationId ? { ...c, isPinned: !c.isPinned } : c
      ).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return +new Date(b.updatedAt) - +new Date(a.updatedAt);
      }),
    })),

  toggleArchive: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isArchived: !c.isArchived } : c
      ),
    })),

  toggleFavorite: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isFavorite: !c.isFavorite } : c
      ),
    })),

  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([k]) => k !== conversationId)
      ),
      activeConversationId:
        state.activeConversationId === conversationId ? null : state.activeConversationId,
    })),

  addReaction: (reaction) =>
    set((state) => {
      // We need to find the conversation that has this message
      let convId = reaction.conversationId;
      if (!convId) {
        for (const [cId, msgs] of Object.entries(state.messages)) {
          if (msgs.some(m => m.id === reaction.messageId)) {
            convId = cId;
            break;
          }
        }
      }
      if (!convId) return state;

      return {
        messages: {
          ...state.messages,
          [convId]: (state.messages[convId] || []).map((m) => {
            if (m.id !== reaction.messageId) return m;
            const currentReactions = m.reactions || [];
            if (currentReactions.some(r => r.userId === reaction.userId && r.emoji === reaction.emoji)) return m;
            return { ...m, reactions: [...currentReactions, reaction] };
          }),
        },
      };
    }),

  removeReaction: (payload) =>
    set((state) => {
      let convId = payload.conversationId;
      if (!convId) {
        for (const [cId, msgs] of Object.entries(state.messages)) {
          if (msgs.some(m => m.id === payload.messageId)) {
            convId = cId;
            break;
          }
        }
      }
      if (!convId) return state;

      return {
        messages: {
          ...state.messages,
          [convId]: (state.messages[convId] || []).map((m) => {
            if (m.id !== payload.messageId) return m;
            const currentReactions = m.reactions || [];
            return { ...m, reactions: currentReactions.filter(r => !(r.userId === payload.userId && r.emoji === payload.emoji)) };
          }),
        },
      };
    }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = new Set(state.typingUsers[conversationId] || []);
      isTyping ? current.add(userId) : current.delete(userId);
      return { typingUsers: { ...state.typingUsers, [conversationId]: current } };
    }),

  setPresence: (userId, isOnline) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      isOnline ? next.add(userId) : next.delete(userId);
      return { onlineUsers: next };
    }),

  setOffline: (isOffline) => set({ isOffline }),

  markMessageViewed: (conversationId, messageId, userId) =>
    set((state) => {
      return {
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) => {
            if (m.id !== messageId) return m;
            const viewedByIds = m.viewedByIds || [];
            if (viewedByIds.includes(userId)) return m;
            return { ...m, viewedByIds: [...viewedByIds, userId], status: "read" };
          }),
        },
      };
    }),
    
  replaceOptimisticMessage: (conversationId, tempId, serverMessage) =>
    set((state) => {
      const messages = state.messages[conversationId] || [];

      // If the real message was already added by the socket event, just remove the optimistic dupe
      const realAlreadyExists = messages.some(
        (m) => m.id === serverMessage.id && m.tempId !== tempId
      );
      const updatedMessages = realAlreadyExists
        ? messages.filter((m) => m.id !== tempId && m.tempId !== tempId) // remove orphaned optimistic
        : messages.map((m) =>
            m.id === tempId || m.tempId === tempId
              ? { ...serverMessage, status: "sent" as MessageStatus }
              : m
          );

      return {
        messages: { ...state.messages, [conversationId]: updatedMessages },
        conversations: state.conversations
          .map((c) => (c.id === conversationId ? { ...c, lastMessage: serverMessage, updatedAt: serverMessage.createdAt } : c))
          .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
      };
    }),

  setMessageStatus: (conversationId, id, status) =>
    set((state) => {
      const messages = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: messages.map(m => m.id === id || m.tempId === id ? { ...m, status } : m),
        }
      };
    }),
}),
{
  name: "wispecho-chat",
  partialize: (state) => {
    // Keep only last 20 messages per conversation to avoid 5MB localStorage limit
    const limitedMessages: Record<string, Message[]> = {};
    for (const [convId, msgs] of Object.entries(state.messages)) {
      limitedMessages[convId] = msgs.slice(-20);
    }
    return {
      conversations: state.conversations,
      messages: limitedMessages,
      activeConversationId: state.activeConversationId,
    };
  },
}
)
);

/**
 * Returns true once zustand's persist middleware has finished
 * rehydrating state from localStorage.
 */
export function useChatHasHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useChatStore.persist.onFinishHydration(() => setHydrated(true));
    if (useChatStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  return hydrated;
}
