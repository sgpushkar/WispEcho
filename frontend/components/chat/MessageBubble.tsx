"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { Message } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";

const QUICK_REACTIONS = ["❤️", "😂", "🔥", "😭", "👍"];

export function MessageBubble({ message }: { message: Message }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isMine = message.senderId === currentUserId;

  async function react(emoji: string) {
    await api.post(`/messages/${message.id}/reactions`, { emoji });
  }

  const grouped = (message.reactions || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`row ${isMine ? "mine" : ""}`}
    >
      <div className={`relative flex flex-col group ${isMine ? "items-end" : "items-start"}`}>
        {message.replyTo && (
          <div className="rounded-lg border-l-2 border-accent/60 bg-white/5 px-2 py-1 text-xs text-white/50 mb-1 max-w-[62%]">
            replying to {message.replyTo.sender?.displayName}
          </div>
        )}

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
              <button
                key={emoji}
                onClick={() => react(emoji)}
                className="glass rounded-full px-2 py-0.5 text-[10px]"
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        {/* Reaction Picker Hover */}
        <div className="pointer-events-none absolute -top-8 left-0 flex gap-0.5 rounded-full opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 z-10">
          <div className="glass flex gap-1 rounded-full px-2 py-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => react(emoji)} className="text-sm hover:scale-125 transition">
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
