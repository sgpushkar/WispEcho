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

export function ChatWindow() {
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const { activeConversationId, setActiveConversation, conversations, messages, setMessages, typingUsers, onlineUsers } = useChatStore();
  const [draft, setDraft] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (data && activeConversationId) setMessages(activeConversationId, data);
  }, [data, activeConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages.length]);

  useEffect(() => {
    if (!activeConversationId) return;
    const socket = getSocket(accessToken);
    socket.emit("conversation:join", activeConversationId);
    api.post(`/messages/conversations/${activeConversationId}/read`);
  }, [activeConversationId]);

  function handleTyping() {
    if (!activeConversationId) return;
    const socket = getSocket(accessToken);
    socket.emit("typing:start", { conversationId: activeConversationId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId: activeConversationId });
    }, 1500);
  }

  async function sendMessage() {
    if (!draft.trim() || !activeConversationId) return;
    const content = draft;
    const replyToId = replyToMessage?.id;
    
    setDraft("");
    setReplyToMessage(null);
    await api.post("/messages", { conversationId: activeConversationId, content, type: "TEXT", replyToId });
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
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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
      <div className="chat-header">
        <button 
          onClick={() => setActiveConversation(null)}
          className="md:hidden mr-2 p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="avatar">
          {avatar ? (
            <img src={avatar} className="h-full w-full object-cover rounded-[14px]" alt="" />
          ) : (
            name?.[0]?.toUpperCase()
          )}
          {isOnline && <span className="dot" />}
        </div>
        <div>
          <div className="chat-title">{name}</div>
          <div className="chat-sub">
            {typingInThisChat.length > 0 ? (
              <div className="flex items-center gap-1">
                <span>typing</span>
                <span className="typing-dot bg-white/50 w-1 h-1" />
                <span className="typing-dot bg-white/50 w-1 h-1" />
                <span className="typing-dot bg-white/50 w-1 h-1" />
              </div>
            ) : isOnline ? "online" : "offline"}
          </div>
        </div>
      </div>

      <div className="messages">
        <AnimatePresence initial={false}>
          {conversationMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onReply={setReplyToMessage} />
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
        <div className="composer-glass">
          <div className="icon-btn">
            <ImageIcon size={18} />
          </div>
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
          />
          <div className="icon-btn hidden sm:flex">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </div>
          <div className="icon-btn hidden sm:flex">
            <Mic size={18} />
          </div>
          <motion.div
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            className="send-btn"
          >
            <Send size={16} color="#e4e4e7" />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
