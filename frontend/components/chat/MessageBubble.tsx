"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Message } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useUIStore } from "@/store/useUIStore";
import { api } from "@/lib/api";
import { Reply, AlertCircle, Eye, CheckCheck } from "lucide-react";
import { ContextMenu, ContextMenuPosition } from "./ContextMenu";
import Link from "next/link";
import { Avatar } from "../ui/Avatar";
import { PendingUpload } from "@/hooks/useImageUpload";
import { FullscreenImageViewer } from "../ui/FullscreenImageViewer";

const QUICK_REACTIONS = ["❤️", "😂", "🔥", "😭", "👍"];

export function MessageBubble({
  message,
  onReply,
  onEdit,
  pendingUpload,
}: {
  message: Message;
  onReply?: (m: Message) => void;
  onEdit?: (m: Message) => void;
  pendingUpload?: PendingUpload;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isMine = message.senderId === currentUserId;
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { removeMessage, activeConversationId, conversations } = useChatStore();
  const { openForwardModal } = useUIStore();

  const currentConversation = conversations.find(c => c.id === activeConversationId);
  const isGroup = currentConversation?.isGroup;

  async function react(emoji: string) {
    if (pendingUpload) return; // Cannot react to pending messages
    await api.post(`/messages/${message.id}/reactions`, { emoji });
  }

  async function deleteMessage(m: Message, forEveryone: boolean) {
    if (!activeConversationId) return;
    await api.delete(`/messages/${m.id}`, { data: { forEveryone } });
    if (!forEveryone) {
      removeMessage(activeConversationId, m.id);
    }
  }

  async function saveMessage(m: Message) {
    await api.post(`/messages/${m.id}/save`);
  }

  const grouped = (message.reactions || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const renderContent = (text: string | null) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Link key={i} href={`/profile?u=${username}`} className="text-accent hover:underline font-medium">
            {part}
          </Link>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={`row ${isMine ? "mine" : ""} items-center gap-2`}
      >
        {isMine && !pendingUpload && (
          <button onClick={() => onReply?.(message)} className="text-white/30 hover:text-white transition p-2 rounded-full hover:bg-white/5" title="Reply">
            <Reply size={16} />
          </button>
        )}
        <div 
          className="flex flex-col max-w-[60%] sm:max-w-[70%] relative group"
          onContextMenu={(e) => {
            if (pendingUpload) return;
            e.preventDefault();
            setContextMenuPos({ x: e.clientX, y: e.clientY });
          }}
        >
          {!isMine && isGroup && (
             <Link href={`/profile?u=${message.sender?.username}`} className="flex items-center gap-2 mb-1 ml-2 group/profile">
               <Avatar src={message.sender?.avatarUrl} name={message.sender?.displayName} className="w-5 h-5 rounded-full text-[8px] border-none" />
               <span className="text-[12px] font-medium text-white/60 group-hover/profile:text-white group-hover/profile:underline transition">{message.sender?.displayName}</span>
             </Link>
          )}
          {message.replyTo && (
            <div className={`border-l-[2px] border-white/20 pl-3 py-0.5 text-[13px] text-white/50 mb-1 w-fit max-w-full line-clamp-2 ${isMine ? "self-end" : "self-start"}`}>
              <span className="font-medium text-white/70">{message.replyTo.sender?.displayName}</span>: {message.replyTo.content}
            </div>
          )}
          <div className={`relative flex flex-col group/bubble ${isMine ? "items-end" : "items-start"}`}>

          <div className={`bubble ${isMine ? "mine" : "theirs"} ${message.isDeleted ? "italic opacity-60" : ""}`}>
            {message.type === "IMAGE" && message.mediaUrl && (
              <div 
                className={`relative overflow-hidden rounded-xl ${message.content ? "mb-2" : ""} cursor-pointer bg-black/20`}
                onClick={async () => {
                  if (pendingUpload) return;
                  const viewed = message.viewedByIds?.includes(currentUserId || "");
                  if (message.isViewOnce && viewed) return;
                  
                  setIsFullscreen(true);
                  if (message.isViewOnce && currentUserId && !viewed) {
                    try {
                      await api.post(`/messages/${message.id}/view`);
                    } catch (e) {
                      console.error("Failed to mark view once", e);
                    }
                  }
                }}
              >
                {message.isViewOnce && message.viewedByIds?.includes(currentUserId || "") ? (
                  <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-white/50 text-xs select-none">
                    <CheckCheck size={16} className="text-accent" />
                    <span>Viewed</span>
                  </div>
                ) : message.isViewOnce && !isMine && !message.viewedByIds?.includes(currentUserId || "") ? (
                  <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-xl text-white text-xs select-none hover:bg-accent/20 transition">
                    <Eye size={16} className="text-accent" />
                    <span className="font-medium">Photo (View once)</span>
                  </div>
                ) : (
                  <>
                    <img 
                      src={message.mediaUrl} 
                      alt={message.content || "Image"} 
                      className={`max-w-full object-contain ${pendingUpload ? "opacity-60 blur-sm" : ""} transition duration-300`} 
                      style={{ maxHeight: "300px" }}
                      loading="lazy"
                    />
                    {message.isViewOnce && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 text-[10px] text-white/90 border border-white/10">
                        <Eye size={12} className="text-accent" />
                        <span>View once</span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Upload Progress Overlay */}
                {pendingUpload && pendingUpload.status === "uploading" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm gap-3">
                    <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                    <span className="text-white font-medium text-sm drop-shadow-md">{pendingUpload.progress}%</span>
                  </div>
                )}
                
                {/* Error Overlay */}
                {pendingUpload && pendingUpload.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/60 backdrop-blur-sm gap-2">
                    <AlertCircle size={32} className="text-white" />
                    <span className="text-white font-medium text-sm drop-shadow-md text-center px-4">Upload failed</span>
                  </div>
                )}
              </div>
            )}
            
            {message.isDeleted ? "this message was deleted" : renderContent(message.content)}
          </div>

          <div className="stamp flex gap-1 items-center justify-end">
            <span>{pendingUpload ? "Sending..." : format(new Date(message.createdAt), "h:mm a")}</span>
            {message.isEdited && <span>· edited</span>}
          </div>

          {Object.keys(grouped).length > 0 && !pendingUpload && (
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
          {!pendingUpload && (
            <div className={`pointer-events-none absolute bottom-full pb-2 ${isMine ? "right-0" : "left-0"} flex gap-1 rounded-full opacity-0 transition group-hover/bubble:pointer-events-auto group-hover/bubble:opacity-100 z-20`}>
              <div className="glass flex gap-1 rounded-full px-2 py-1 items-center shadow-xl">
                {QUICK_REACTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => react(emoji)} className="text-sm hover:scale-125 transition">
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Always Visible Reply Button */}
        {!isMine && !pendingUpload && (
          <button onClick={() => onReply?.(message)} className="text-white/30 hover:text-white transition p-2 rounded-full hover:bg-white/5" title="Reply">
            <Reply size={16} />
          </button>
        )}
      </motion.div>

      {!pendingUpload && (
        <ContextMenu 
          position={contextMenuPos} 
          message={message} 
          onClose={() => setContextMenuPos(null)} 
          onReply={(m) => onReply?.(m)}
          onReact={(m) => react(QUICK_REACTIONS[0])}
          onDelete={deleteMessage}
          onEdit={(m) => onEdit?.(m)}
          onForward={(m) => openForwardModal(m)}
          onSave={saveMessage}
        />
      )}

      {/* Fullscreen Image Viewer Modal */}
      <AnimatePresence>
        {isFullscreen && message.type === "IMAGE" && message.mediaUrl && (
          <FullscreenImageViewer
            url={message.mediaUrl}
            caption={message.content || undefined}
            onClose={() => setIsFullscreen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
