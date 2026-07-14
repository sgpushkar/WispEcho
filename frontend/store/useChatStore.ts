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
  togglePin: (conversationId: string) => void;
  addReaction: (reaction: { id: string; emoji: string; userId: string; messageId: string; conversationId?: string }) => void;
  removeReaction: (payload: { messageId: string; userId: string; emoji: string; conversationId?: string }) => void;
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
}));
