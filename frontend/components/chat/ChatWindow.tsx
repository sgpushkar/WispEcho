"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, ArrowLeft, Mic } from "lucide-react";
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
    setDraft("");
    await api.post("/messages", { conversationId: activeConversationId, content, type: "TEXT" });
  }

  if (!conversation) {
    return (
      <main className="chat glass w-full h-full hidden md:flex items-center justify-center">
        <div className="text-white/30 text-sm">pick a chat and let's get into it 💬</div>
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
            {typingInThisChat.length > 0 ? "typing..." : isOnline ? "online" : "offline"}
          </div>
        </div>
      </div>

      <div className="messages">
        <AnimatePresence initial={false}>
          {conversationMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
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
        <div className="composer-glass">
          <div className="icon-btn hover:text-white transition">
            <ImageIcon size={18} />
          </div>
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="say something..."
          />
          <div className="icon-btn hover:text-white transition hidden sm:flex">
            <Mic size={18} />
          </div>
          <motion.div
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            className="send-btn"
          >
            <Send size={16} color="#0b0e16" />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
