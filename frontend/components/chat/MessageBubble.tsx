"use client";

import { useState, useRef, memo } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { format } from "date-fns";
import { Message } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useUIStore } from "@/store/useUIStore";
import { api } from "@/lib/api";
import { Reply, AlertCircle, Eye, CheckCheck, Clock, Check, X, Lock, Forward } from "lucide-react";
import { ContextMenu, ContextMenuPosition } from "./ContextMenu";
import Link from "next/link";
import { Avatar } from "../ui/Avatar";
import { PendingUpload } from "@/hooks/useImageUpload";
import { FullscreenImageViewer } from "../ui/FullscreenImageViewer";
import { useMessageRetry } from "@/hooks/useMessageRetry";
import { ProgressiveImage } from "../ui/ProgressiveImage";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { VoicePlayer } from "./VoicePlayer";
import { useSecureImage } from "@/hooks/useSecureImage";
import { PollBubble } from "./PollBubble";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Plus } from "lucide-react";

const QUICK_REACTIONS = ["❤️", "😂", "🔥", "😭", "👍"];

interface MessageBubbleProps {
  message: Message;
  isGroup?: boolean;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  pendingUpload?: PendingUpload;
  onCancelUpload?: (tempId: string) => void;
  onRetryUpload?: (tempId: string) => void;
  // Feature v2
  isSelectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const MessageBubble = memo(function MessageBubble({ 
  message, isGroup, onReply, onEdit, pendingUpload, onCancelUpload, onRetryUpload,
  isSelectable, isSelected, onToggleSelect
}: MessageBubbleProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isMine = message.senderId === currentUserId;
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { removeMessage, activeConversationId, conversations } = useChatStore();
  const { openForwardModal } = useUIStore();
  const { retryMessage, deleteFailedMessage } = useMessageRetry();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const currentConversation = conversations.find(c => c.id === activeConversationId);
  
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);
  const lastTapRef = useRef<number>(0);

  const alreadyViewed = !!(message.isViewOnce && message.viewedByIds?.includes(currentUserId || ""));

  // ─── Secure image URL ───────────────────────────────────────────────────────
  // For images: fetch a short-lived signed URL from the backend instead of using the raw URL.
  // Handles both legacy (public URL) and new (authenticated) Cloudinary images.
  // - View-once images already viewed: no URL fetched, placeholder shown
  // - Pending uploads: use local blob preview URL directly
  const isImageMessage = message.type === "IMAGE";
  const hasId = !!message.id && !message.id.startsWith("temp_");

  const { url: secureImageUrl, loading: imageLoading } = useSecureImage({
    messageId: hasId && isImageMessage ? message.id : null,
    isViewOnce: message.isViewOnce,
    alreadyViewed: alreadyViewed && !isMine,
    enabled: isImageMessage && !pendingUpload && hasId,
  });

  // For pending uploads, show the local preview
  const displayImageUrl = pendingUpload?.previewUrl ?? secureImageUrl;

  async function handleDragEnd(event: any, info: any) {
    setIsDragging(false);
    if (info.offset.x > 50 && !pendingUpload) {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
      onReply?.(message);
    }
    controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
  }

  async function react(emoji: string) {
    if (pendingUpload) return; // Cannot react to pending messages
    try {
      await api.post(`/messages/${message.id}/reactions`, { emoji });
      setShowEmojiPicker(false);
    } catch (err) {
      console.error(err);
    }
  }

  // Extract first URL for link preview
  const rawUrlMatch = message.type === "TEXT" && message.content ? message.content.match(/(https?:\/\/[^\s]+)/) : null;
  const firstUrl = rawUrlMatch ? rawUrlMatch[0].replace(/[.,;:?!"')\]]+$/, "") : null;

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
    
    // Basic Markdown Parsing: **bold**, *italic*, ~strikethrough~
    let parsedText = text;
    parsedText = parsedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsedText = parsedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    parsedText = parsedText.replace(/~(.*?)~/g, '<del>$1</del>');

    // Mentions Parsing
    const parts = parsedText.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        if (username === "everyone" || username === "here") {
          return <span key={i} className="bg-accent/20 text-accent px-1 rounded-sm font-bold">{part}</span>;
        }
        return (
          <Link key={i} href={`/profile/${username}`} className="text-accent hover:underline font-medium">
            {part}
          </Link>
        );
      }
      return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
    });
  };

  // ─── Image content renderer ──────────────────────────────────────────────────
  const renderImageContent = () => {
    if (!isImageMessage) return null;

    // Sender sees their own sent view-once (pre-viewed state)
    if (message.isViewOnce && isMine) {
      return (
        <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-xl text-white text-xs select-none">
          <Lock size={14} className="text-accent" />
          <span className="font-medium">View once sent</span>
          {message.viewedByIds && message.viewedByIds.length > 0 && (
            <span className="text-white/50 ml-1">· Viewed</span>
          )}
        </div>
      );
    }

    // Already viewed — show placeholder, never load URL
    if (alreadyViewed) {
      return (
        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-white/50 text-xs select-none">
          <CheckCheck size={16} className="text-accent" />
          <span>Viewed</span>
        </div>
      );
    }

    // View-once not yet opened — show tap-to-view prompt (no image preview)
    if (message.isViewOnce && !isMine && !alreadyViewed) {
      return (
        <div
          className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-xl text-white text-xs select-none hover:bg-accent/20 transition cursor-pointer"
          onClick={handleImageClick}
        >
          <div>
            <Forward size={14} className="text-white/40" />
          </div>
          <span className="font-medium">Photo (View once)</span>
        </div>
      );
    }

    // Normal image or view-once first open
    return (
      <div
        className={`relative overflow-hidden rounded-xl ${message.content ? "mb-2" : ""} cursor-pointer bg-black/20`}
        onClick={handleImageClick}
      >
        {displayImageUrl ? (
          <>
            <ProgressiveImage
              src={displayImageUrl}
              alt={message.content || "Image"}
              className={`max-w-full ${pendingUpload ? "opacity-60 blur-sm" : ""} transition duration-300`}
              style={{ maxHeight: "300px" }}
              isViewOnce={message.isViewOnce}
            />
            {message.isViewOnce && !alreadyViewed && (
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 text-[10px] text-white/90 border border-white/10">
                <Eye size={12} className="text-accent" />
                <span>View once</span>
              </div>
            )}
          </>
        ) : imageLoading ? (
          <div className="flex items-center justify-center w-full" style={{ minHeight: "120px" }}>
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          // URL failed to load (e.g. legacy broken link)
          <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-white/40 text-xs select-none">
            <AlertCircle size={14} />
            <span>Image unavailable</span>
          </div>
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
            <div className="flex gap-2 mt-2">
              <button
                onClick={(e) => { e.stopPropagation(); onCancelUpload?.(pendingUpload.id); }}
                className="bg-white/10 px-3 py-1 rounded-full text-xs hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRetryUpload?.(pendingUpload.id); }}
                className="bg-accent text-white px-3 py-1 rounded-full text-xs hover:bg-accent/90 transition"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleImageClick = async () => {
    if (pendingUpload) return;
    if (alreadyViewed && !isMine) return;
    if (message.isViewOnce && isMine) return;

    setIsFullscreen(true);

    // Mark view-once as viewed (server-side) and null out the URL
    if (message.isViewOnce && currentUserId && !alreadyViewed && !isMine) {
      try {
        await api.post(`/messages/${message.id}/view`);
      } catch (e) {
        console.error("Failed to mark view once", e);
      }
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={`row ${isMine ? "mine" : ""} items-center gap-2 relative`}
      >
        {isSelectable && (
          <div className="mr-2" onClick={() => onToggleSelect?.(message.id)}>
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-accent border-accent' : 'border-white/30'}`}>
              {isSelected && <Check size={14} className="text-white" />}
            </div>
          </div>
        )}

        {!isMine && !pendingUpload && !isSelectable && (
          <motion.div 
            className="absolute left-0 text-white/50" 
            initial={{ opacity: 0, scale: 0 }} 
            animate={{ opacity: isDragging ? 1 : 0, scale: isDragging ? 1 : 0 }}
          >
            <Reply size={16} />
          </motion.div>
        )}
        
        {isMine && !pendingUpload && !isSelectable && (
          <button onClick={() => onReply?.(message)} className="text-white/30 hover:text-white transition p-2 rounded-full hover:bg-white/5" title="Reply">
            <Reply size={16} />
          </button>
        )}
        <motion.div 
          drag={!pendingUpload ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.2 }}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          animate={controls}
          className={`flex flex-col max-w-[60%] sm:max-w-[70%] relative group ${!isMine && !pendingUpload ? "touch-pan-y" : ""}`}
          onContextMenu={(e) => {
            if (pendingUpload) return;
            // Block context menu on images for privacy
            if (isImageMessage) return;
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
            {message.isForwarded && (
              <div className="flex items-center gap-1 text-[11px] text-white/50 mb-1 italic">
                <Reply size={12} className="-scale-x-100" />
                <span>Forwarded</span>
              </div>
            )}

            {/* Secure image rendering — skip for deleted messages */}
            {isImageMessage && !message.isDeleted && renderImageContent()}
            
            {message.type === "VOICE" && message.mediaUrl ? (
              <VoicePlayer url={message.mediaUrl} isMine={isMine} />
            ) : message.type === "POLL" ? (
              <PollBubble message={message} />
            ) : message.isDeleted ? (
              "this message was deleted"
            ) : (
              renderContent(message.content)
            )}
            
            {firstUrl && !message.isDeleted && (
              <LinkPreviewCard url={firstUrl} />
            )}
          </div>

          <div className="stamp flex gap-1 items-center justify-end">
            <span>{pendingUpload ? "Sending..." : format(new Date(message.createdAt), "h:mm a")}</span>
            {message.isEdited && <span>· edited</span>}
            {isMine && !pendingUpload && (
              <span className="ml-1 flex items-center">
                {message.status === "sending" && <Clock size={10} className="text-white/50" />}
                {message.status === "sent" && <Check size={12} className="text-white/50" />}
                {message.status === "delivered" && <CheckCheck size={12} className="text-white/50" />}
                {message.status === "read" && <CheckCheck size={12} className="text-accent" />}
                {message.status === "failed" && <AlertCircle size={12} className="text-red-500" />}
                {message.scheduledAt && (
                  <span title="Scheduled">
                    <Clock size={12} className="text-blue-400 ml-1" />
                  </span>
                )}
              </span>
            )}
          </div>
          
          {message.status === "failed" && isMine && (
             <motion.div 
               initial={{ opacity: 0, height: 0 }} 
               animate={{ opacity: 1, height: "auto" }} 
               className="flex gap-2 justify-end mt-1"
             >
               <button onClick={() => deleteFailedMessage(message.conversationId, message.id)} className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full hover:bg-red-500/20 transition">Delete</button>
               <button onClick={() => retryMessage(message.conversationId, message.id)} className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full hover:bg-accent/20 transition">Retry</button>
             </motion.div>
          )}

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
              <div className="glass flex gap-1 rounded-full px-2 py-1 items-center shadow-xl relative">
                {QUICK_REACTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => react(emoji)} className="text-sm hover:scale-125 transition">
                    {emoji}
                  </button>
                ))}
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-white/50 hover:text-white transition p-1 hover:bg-white/10 rounded-full ml-1">
                  <Plus size={14} />
                </button>

                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute bottom-full mb-2 right-0 pointer-events-auto"
                    >
                      <EmojiPicker 
                        theme={Theme.DARK} 
                        onEmojiClick={(emoji) => react(emoji.emoji)}
                        autoFocusSearch={false}
                        lazyLoadEmojis={true}
                        width={280}
                        height={350}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
          </div>
        </motion.div>

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
        {isFullscreen && isImageMessage && displayImageUrl && (
          <FullscreenImageViewer
            url={displayImageUrl}
            caption={message.content || undefined}
            onClose={() => setIsFullscreen(false)}
            isViewOnce={Boolean(message.isViewOnce)}
          />
        )}
      </AnimatePresence>
    </>
  );
}, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.status === next.message.status &&
    prev.message.content === next.message.content &&
    prev.message.isDeleted === next.message.isDeleted &&
    prev.message.isEdited === next.message.isEdited &&
    prev.message.isPinned === next.message.isPinned &&
    prev.message.viewedByIds?.length === next.message.viewedByIds?.length &&
    JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions) &&
    prev.pendingUpload?.status === next.pendingUpload?.status &&
    prev.pendingUpload?.progress === next.pendingUpload?.progress
  );
});
