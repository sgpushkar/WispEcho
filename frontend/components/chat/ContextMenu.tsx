"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reply, SmilePlus, Copy, Edit2, Trash2, Forward } from "lucide-react";
import { createPortal } from "react-dom";
import { Message } from "@/store/useChatStore";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  message: Message | null;
  onClose: () => void;
  onReply: (m: Message) => void;
  onReact: (m: Message) => void;
  onDelete: (m: Message) => void;
  onEdit: (m: Message) => void;
  onForward: (m: Message) => void;
}

export function ContextMenu({ position, message, onClose, onReply, onReact, onDelete, onEdit, onForward }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    if (position) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [position, onClose]);

  if (!position || !message) return null;

  // Simple boundary collision detection
  const x = Math.min(position.x, typeof window !== "undefined" ? window.innerWidth - 200 : position.x);
  const y = Math.min(position.y, typeof window !== "undefined" ? window.innerHeight - 300 : position.y);

  const menu = (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -5 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{ left: x, top: y }}
        className="absolute pointer-events-auto w-48 rounded-[16px] glass-strong shadow-2xl border border-white/10 p-1.5 flex flex-col gap-0.5"
      >
        <ContextItem icon={<Reply size={14} />} label="Reply" onClick={() => { onReply(message); onClose(); }} />
        <ContextItem icon={<SmilePlus size={14} />} label="React" onClick={() => { onReact(message); onClose(); }} />
        <div className="h-[1px] bg-white/5 my-1 mx-2" />
        <ContextItem icon={<Copy size={14} />} label="Copy Text" onClick={() => { navigator.clipboard.writeText(message.content || ""); onClose(); }} />
        <ContextItem icon={<Forward size={14} />} label="Forward" onClick={() => { onForward(message); onClose(); }} />
        <div className="h-[1px] bg-white/5 my-1 mx-2" />
        <ContextItem icon={<Edit2 size={14} />} label="Edit" onClick={() => { onEdit(message); onClose(); }} />
        <ContextItem icon={<Trash2 size={14} />} label="Delete" onClick={() => { onDelete(message); onClose(); }} danger />
      </motion.div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(menu, document.body) : null;
}

function ContextItem({ icon, label, onClick, danger }: { icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
        danger 
          ? "text-red-400 hover:bg-red-400/10 hover:text-red-300" 
          : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
