import { create } from "zustand";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "VOICE" | "GIF";
  content: string | null;
  mediaUrl: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  reactions?: { id: string; emoji: string; userId: string }[];
  replyTo?: Message | null;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  group?: { id: string; name: string; avatarUrl?: string | null } | null;
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

  setConversations: (c: Conversation[]) => void;
  upsertConversation: (c: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  prependMessages: (conversationId: string, msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (msg: Partial<Message> & { id: string; conversationId: string }) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setPresence: (userId: string, isOnline: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),

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
    set((state) => ({ messages: { ...state.messages, [conversationId]: msgs } })),

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
      if (existing.some((m) => m.id === msg.id)) return state;
      const conv = state.conversations.find((c) => c.id === msg.conversationId);
      return {
        messages: { ...state.messages, [msg.conversationId]: [...existing, msg] },
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
          m.id === messageId ? { ...m, isDeleted: true, content: null } : m
        ),
      },
    })),

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
}));
