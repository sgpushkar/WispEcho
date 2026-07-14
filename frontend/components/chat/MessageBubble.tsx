"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Message } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useUIStore } from "@/store/useUIStore";
import { api } from "@/lib/api";
import { Reply } from "lucide-react";
import { ContextMenu, ContextMenuPosition } from "./ContextMenu";

const QUICK_REACTIONS = ["❤️", "😂", "🔥", "😭", "👍"];

export function MessageBubble({ message, onReply, onEdit }: { message: Message; onReply?: (m: Message) => void; onEdit?: (m: Message) => void }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isMine = message.senderId === currentUserId;
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const { removeMessage, activeConversationId } = useChatStore();
  const { openForwardModal } = useUIStore();

  async function react(emoji: string) {
    await api.post(`/messages/${message.id}/reactions`, { emoji });
  }

  async function deleteMessage(m: Message) {
    if (!activeConversationId) return;
    await api.delete(`/messages/${m.id}`);
    removeMessage(activeConversationId, m.id);
  }

  const grouped = (message.reactions || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={`row ${isMine ? "mine" : ""} items-center gap-2`}
      >
        {isMine && (
          <button onClick={() => onReply?.(message)} className="text-white/30 hover:text-white transition p-2 rounded-full hover:bg-white/5" title="Reply">
            <Reply size={16} />
          </button>
        )}
        <div 
          className="flex flex-col max-w-[60%] relative group"
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenuPos({ x: e.clientX, y: e.clientY });
          }}
        >
          {message.replyTo && (
            <div className={`border-l-[2px] border-white/20 pl-3 py-0.5 text-[13px] text-white/50 mb-1 w-fit max-w-full line-clamp-2 ${isMine ? "self-end" : "self-start"}`}>
              <span className="font-medium text-white/70">{message.replyTo.sender?.displayName}</span>: {message.replyTo.content}
            </div>
          )}
          <div className={`relative flex flex-col group/bubble ${isMine ? "items-end" : "items-start"}`}>

          <div className={`bubble ${isMine ? "mine" : "theirs"} ${message.isDeleted ? "italic opacity-60" : ""}`}>
            {message.isDeleted ? "this message was deleted" : message.content}
            {message.type === "IMAGE" && message.mediaUrl && (
              <img src={message.mediaUrl} alt="" className="mt-2 max-w-full rounded-xl" />
            )}
          </div>

          <div className="stamp flex gap-1 items-center justify-end">
            <span>{format(new Date(message.createdAt), "h:mm a")}</span>
            {message.isEdited && <span>· edited</span>}
          </div>

          {Object.keys(grouped).length > 0 && (
            <div className={`flex gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
              {Object.entries(grouped).map(([emoji, count]) => (
                <motion.button
                  key={emoji}
                  onClick={() => react(emoji)}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="glass rounded-full px-2.5 py-1 text-[11px] shadow-md flex items-center gap-1 border border-white/10"
                >
                  <span>{emoji}</span>
                  <span className="opacity-70">{count}</span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Hover Actions */}
          <div className={`pointer-events-none absolute -top-10 ${isMine ? "right-0" : "left-0"} flex gap-1 rounded-full opacity-0 transition group-hover/bubble:pointer-events-auto group-hover/bubble:opacity-100 z-20`}>
            <div className="glass flex gap-1 rounded-full px-2 py-1 items-center shadow-xl">
              {QUICK_REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => react(emoji)} className="text-sm hover:scale-125 transition">
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* Always Visible Reply Button */}
        {!isMine && (
          <button onClick={() => onReply?.(message)} className="text-white/30 hover:text-white transition p-2 rounded-full hover:bg-white/5" title="Reply">
            <Reply size={16} />
          </button>
        )}
      </motion.div>

      <ContextMenu 
        position={contextMenuPos} 
        message={message} 
        onClose={() => setContextMenuPos(null)} 
        onReply={(m) => onReply?.(m)}
        onReact={(m) => react(QUICK_REACTIONS[0])}
        onDelete={deleteMessage}
        onEdit={(m) => onEdit?.(m)}
        onForward={(m) => openForwardModal(m)}
      />
    </>
  );
}
