"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { useUIStore } from "@/store/useUIStore";
import { api } from "@/lib/api";
import { useState } from "react";

export function ForwardModal() {
  const { forwardModalOpen, closeForwardModal, messageToForward } = useUIStore();
  const { conversations } = useChatStore();
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  if (!forwardModalOpen || !messageToForward) return null;

  async function handleForward(conversationId: string) {
    setSendingTo(conversationId);
    try {
      await api.post("/messages", {
        conversationId,
        content: messageToForward.content,
        type: "TEXT"
      });
      closeForwardModal();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeForwardModal}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-sm rounded-[24px] glass-strong shadow-2xl p-6 border border-white/10"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Forward Message</h2>
          <button onClick={closeForwardModal} className="rounded-full p-1.5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/5 text-[13px] text-white/70 line-clamp-2">
          "{messageToForward.content}"
        </div>

        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1">
          {conversations.map((c) => {
            const name = c.isGroup ? c.group?.name : c.otherUser?.displayName;
            const avatar = c.isGroup ? c.group?.avatarUrl : c.otherUser?.avatarUrl;
            
            return (
              <button
                key={c.id}
                onClick={() => handleForward(c.id)}
                disabled={sendingTo === c.id}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-[10px] font-bold">
                    {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-white/90">{name}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white/10">
                  <Send size={12} className="text-white" />
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
