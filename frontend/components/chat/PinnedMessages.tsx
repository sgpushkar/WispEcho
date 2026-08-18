"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Pin, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Message } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";

interface PinnedMessagesProps {
  conversationId: string;
}

export function PinnedMessages({ conversationId }: PinnedMessagesProps) {
  const currentUserId = useAuthStore(s => s.user?.id);
  const [expanded, setExpanded] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  const { data: pinnedMessages = [] } = useQuery<Message[]>({
    queryKey: ["pinnedMessages", conversationId],
    queryFn: async () => {
      const res = await api.get(`/messages/conversations/${conversationId}/pins`);
      const list = res.data.pins || res.data.messages || [];
      return list.map((p: any) => p.message || p);
    },
    enabled: !!conversationId
  });

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const safeIdx = Math.min(currentIdx, Math.max(0, pinnedMessages.length - 1));
  const currentMsg = pinnedMessages[safeIdx];
  if (!currentMsg) return null;

  const handleUnpin = async (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/messages/conversations/${conversationId}/pin/${msgId}`);
      setCurrentIdx(0);
    } catch (err) {
      console.error(err);
    }
  };

  const nextPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % pinnedMessages.length);
  };

  return (
    <div 
      className={`bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-white/10 transition z-10`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3 flex-1 overflow-hidden">
        <Pin size={16} className="text-accent mt-0.5 shrink-0" />
        <div className="flex flex-col flex-1 overflow-hidden">
          <span className="text-xs font-semibold text-accent mb-0.5">Pinned Message</span>
          <span className="text-sm text-white/80 truncate">
            {currentMsg.senderId === currentUserId ? 'You' : currentMsg.sender?.displayName}: {currentMsg.content || (currentMsg.type !== "TEXT" ? currentMsg.type : "")}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {pinnedMessages.length > 1 && (
          <div className="text-xs text-white/50 bg-white/10 px-2 rounded-full cursor-pointer hover:bg-white/20 transition" onClick={nextPin}>
            {currentIdx + 1}/{pinnedMessages.length}
          </div>
        )}
        <button onClick={(e) => handleUnpin(e, currentMsg.id)} className="p-1 text-white/40 hover:text-white transition rounded-full hover:bg-white/10" title="Unpin">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
