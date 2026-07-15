"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, ArrowLeft, Mic, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useChatStore, Message } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { getSocket } from "@/lib/socket";
import { MessageBubble } from "./MessageBubble";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";
import { Edit2 } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useRouter } from "next/navigation";
import EmojiPicker, { Theme } from "emoji-picker-react";

export function ChatWindow() {
  const router = useRouter();
  const { setGroupSettingsOpen } = useUIStore();
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const { activeConversationId, setActiveConversation, conversations, messages, setMessages, typingUsers, onlineUsers } = useChatStore();
  const [draft, setDraft] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastTypedEmitted = useRef(0);

  const conversation = conversations.find((c) => c.id === activeConversationId);
  const conversationMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const typingInThisChat = activeConversationId
    ? Array.from(typingUsers[activeConversationId] || [])
    : [];

  const { data } = useQuery({
    enabled: !!activeConversationId,
    queryKey: ["messages", activeConversationId],
    queryFn: async () =>
      (await api.get(`/messages/conversations/${activeConversationId}/messages`)).data.messages as Message[],
  });

  const { containerRef, visibleItems, paddingTop, paddingBottom, isAtBottom } = useVirtualScroll({ items: conversationMessages });

  useEffect(() => {
    if (data && activeConversationId) setMessages(activeConversationId, data);
  }, [data, activeConversationId]);

  useEffect(() => {
    // Only auto-scroll if we were already at the bottom, 
    // or if the newest message is from us (handled in sendMessage)
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages.length]);

  useEffect(() => {
    if (!activeConversationId) return;
    const socket = getSocket(accessToken);
    socket.emit("conversation:join", activeConversationId);
    api.post(`/messages/conversations/${activeConversationId}/read`);
  }, [activeConversationId]);

  useEffect(() => {
    if (editingMessage) {
      setDraft(editingMessage.content || "");
    }
  }, [editingMessage]);

  function handleTyping() {
    if (!activeConversationId) return;
    const socket = getSocket(accessToken);
    
    const now = Date.now();
    if (now - lastTypedEmitted.current > 1500) {
      socket.emit("typing:start", { conversationId: activeConversationId });
      lastTypedEmitted.current = now;
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId: activeConversationId });
    }, 1500);
  }

  async function sendMessage() {
    if (!draft.trim() || !activeConversationId) return;
    const content = draft;
    
    setIsSending(true);

    if (editingMessage) {
      await api.patch(`/messages/${editingMessage.id}`, { content });
      setEditingMessage(null);
      setDraft("");
    } else {
      const replyToId = replyToMessage?.id;
      setReplyToMessage(null);
      setDraft("");
      await api.post("/messages", { conversationId: activeConversationId, content, type: "TEXT", replyToId });
    }
    
    setShowEmojiPicker(false);
    setTimeout(() => {
      setIsSending(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  }

  if (!conversation) {
    return (
      <main className="chat glass w-full h-full hidden md:flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              rotate: [-2, 2, -2]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6 h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
          >
            <Send size={24} className="ml-1" />
          </motion.div>
          <h2 className="text-lg font-medium text-white mb-2">Select a conversation</h2>
          <p className="text-sm text-white/40">Your messages will appear here.</p>
        </motion.div>
      </main>
    );
  }

  const name = conversation.isGroup ? conversation.group?.name : conversation.otherUser?.displayName;
  const avatar = conversation.isGroup ? conversation.group?.avatarUrl : conversation.otherUser?.avatarUrl;
  const isOnline = conversation.otherUser ? onlineUsers.has(conversation.otherUser.id) : false;

  return (
    <main className="chat glass h-full w-full flex flex-col">
      <div className="chat-header h-[64px] shrink-0">
        <button 
          onClick={() => setActiveConversation(null)}
          className="md:hidden mr-2 p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <ArrowLeft size={18} />
        </button>
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 2 }} 
          className="avatar cursor-pointer shadow-md"
          onClick={() => {
            if (conversation.isGroup && conversation.group) {
              setGroupSettingsOpen(true, conversation.group.id);
            } else if (conversation.otherUser) {
              router.push(`/profile/${conversation.otherUser.username}`);
            }
          }}
        >
          {avatar ? (
            <img src={avatar} className="h-full w-full object-cover rounded-[14px]" alt="" />
          ) : (
            name?.[0]?.toUpperCase()
          )}
          {isOnline && <span className="dot" />}
        </motion.div>
        <div 
          className="cursor-pointer"
          onClick={() => {
            if (conversation.isGroup && conversation.group) {
              setGroupSettingsOpen(true, conversation.group.id);
            } else if (conversation.otherUser) {
              router.push(`/profile/${conversation.otherUser.username}`);
            }
          }}
        >
          <div className="chat-title leading-tight hover:underline">{name}</div>
          <div className="chat-sub">
            {typingInThisChat.length > 0 ? (
              <div className="flex items-center gap-1 mt-0.5">
                <motion.span 
                  animate={{ y: [0, -2, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} 
                  className="w-1 h-1 bg-white/50 rounded-full" 
                />
                <motion.span 
                  animate={{ y: [0, -2, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} 
                  className="w-1 h-1 bg-white/50 rounded-full" 
                />
                <motion.span 
                  animate={{ y: [0, -2, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} 
                  className="w-1 h-1 bg-white/50 rounded-full" 
                />
              </div>
            ) : isOnline ? "online" : "offline"}
          </div>
        </div>
      </div>

      <div className="messages" ref={containerRef}>
        <div style={{ paddingTop, paddingBottom }}>
          <AnimatePresence initial={false}>
            {visibleItems.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                onReply={setReplyToMessage} 
                onEdit={setEditingMessage}
              />
            ))}
          </AnimatePresence>

          {typingInThisChat.length > 0 && (
            <div className="row">
              <div className="typing-row">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="composer">
        {replyToMessage && (
          <div className="mb-3 flex items-center justify-between rounded-[20px] bg-white/5 border border-white/10 px-5 py-3 text-[13px] text-white/60">
            <div className="flex flex-col">
              <span className="text-white font-medium mb-1">Replying to {replyToMessage.sender?.displayName}</span>
              <span className="truncate max-w-[200px] sm:max-w-[400px]">{replyToMessage.content}</span>
            </div>
            <button onClick={() => setReplyToMessage(null)} className="hover:text-white transition bg-white/5 p-1.5 rounded-full">
              <X size={14} />
            </button>
          </div>
        )}
        {editingMessage && (
          <div className="mb-3 flex items-center justify-between rounded-[20px] bg-white/5 border border-white/10 px-5 py-3 text-[13px] text-white/60">
            <div className="flex flex-col">
              <span className="text-white font-medium mb-1 flex items-center gap-2"><Edit2 size={12}/> Editing Message</span>
              <span className="truncate max-w-[200px] sm:max-w-[400px]">{editingMessage.content}</span>
            </div>
            <button onClick={() => { setEditingMessage(null); setDraft(""); }} className="hover:text-white transition bg-white/5 p-1.5 rounded-full">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="composer-glass">
          <motion.div whileHover={{ scale: 1.1, filter: "brightness(1.2)" }} className="icon-btn">
            <ImageIcon size={18} />
          </motion.div>
          <textarea
            value={draft}
            rows={1}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                e.currentTarget.style.height = "auto";
              }
            }}
            placeholder="say something..."
            className="flex-1 bg-transparent border-none outline-none text-white font-inter text-[14px] min-h-[22px] max-h-[120px] resize-none py-1 placeholder:text-white/30 transition-opacity focus:placeholder:opacity-50"
          />
          <div className="relative">
            <motion.div 
              whileHover={{ scale: 1.1, filter: "brightness(1.2)" }} 
              className="icon-btn hidden sm:flex cursor-pointer"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </motion.div>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-12 right-0 z-50 shadow-2xl"
                >
                  <EmojiPicker 
                    theme={Theme.DARK} 
                    onEmojiClick={(emoji) => setDraft((prev) => prev + emoji.emoji)}
                    autoFocusSearch={false}
                    lazyLoadEmojis={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.div whileHover={{ scale: 1.1, filter: "brightness(1.2)" }} className="icon-btn hidden sm:flex">
            <Mic size={18} />
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05, rotate: -5, filter: "brightness(1.2)" }}
            whileTap={{ scale: 0.9 }}
            animate={isSending ? { scale: [1, 1.2, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={sendMessage}
            className="send-btn"
          >
            <Send size={16} color="#ffffff" />
          </motion.button>
        </div>
      </div>
    </main>
  );
}
