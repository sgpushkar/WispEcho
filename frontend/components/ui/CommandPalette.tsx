"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Settings, Users, MessageSquare } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { conversations, setActiveConversation } = useChatStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredConvs = conversations.filter(c => {
    const name = c.isGroup ? c.group?.name : c.otherUser?.displayName;
    return name?.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-[500px] overflow-hidden rounded-[24px] glass-strong shadow-2xl border border-white/10"
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          <Search size={18} className="text-white/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to..."
            className="flex-1 bg-transparent outline-none text-white placeholder-white/30 text-[15px]"
          />
          <div className="text-[10px] px-1.5 py-0.5 rounded border border-white/20 text-white/40 font-mono uppercase">
            esc
          </div>
        </div>

        <div className="max-h-[350px] overflow-y-auto p-2 scrollbar-none">
          {query.length === 0 && (
            <div className="px-3 py-2 text-[11px] font-medium text-white/40 uppercase tracking-wider">
              Quick Actions
            </div>
          )}
          {query.length === 0 && (
            <>
              <button onClick={() => setIsOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/80 transition-colors text-[14px]">
                <Settings size={16} className="text-white/40" /> Settings
              </button>
              <button onClick={() => setIsOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/80 transition-colors text-[14px]">
                <Users size={16} className="text-white/40" /> New Group
              </button>
            </>
          )}

          {(query.length > 0 || filteredConvs.length > 0) && (
            <div className="px-3 py-2 mt-2 text-[11px] font-medium text-white/40 uppercase tracking-wider">
              Conversations
            </div>
          )}
          {filteredConvs.map(conv => {
             const name = conv.isGroup ? conv.group?.name : conv.otherUser?.displayName;
             return (
               <button 
                 key={conv.id}
                 onClick={() => {
                   setActiveConversation(conv.id);
                   setIsOpen(false);
                 }}
                 className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/80 transition-colors text-[14px]"
               >
                 <MessageSquare size={16} className="text-white/40" /> {name}
               </button>
             );
          })}
          
          {query.length > 0 && filteredConvs.length === 0 && (
            <div className="px-3 py-6 text-center text-[13px] text-white/40">
              No results found.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
