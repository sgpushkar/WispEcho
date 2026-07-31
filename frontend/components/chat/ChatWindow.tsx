"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, ArrowLeft, Mic, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useChatStore, Message } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { getSocket } from "@/lib/socket";
import { MessageBubble } from "./MessageBubble";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";
import { Edit2 } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useRouter } from "next/navigation";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Avatar } from "../ui/Avatar";
import { useImageUpload } from "@/hooks/useImageUpload";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { MentionSuggestions } from "./MentionSuggestions";
import { SharedMediaModal } from "./SharedMediaModal";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { VoiceRecorder } from "./VoiceRecorder";

export function ChatWindow() {
  const router = useRouter();
  const { setGroupSettingsOpen } = useUIStore();
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const { activeConversationId, setActiveConversation, conversations, messages, setMessages, typingUsers, onlineUsers, addMessage } = useChatStore();
  
  const [draft, setDraft] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showSharedMedia, setShowSharedMedia] = useState(false);

  const {
    isRecording,
    recordingTime,
    isPaused,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastTypedEmitted = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { pendingUploads, addPendingUpload, uploadFile, removePendingUpload, cancelUpload, retryUpload } = useImageUpload();
  const { enqueue } = useOfflineQueue();
  const isOffline = useChatStore((s) => s.isOffline);

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

  const { containerRef, visibleItems, paddingTop, paddingBottom, isAtBottom } = useVirtualScroll({ items: conversationMessages });

  useEffect(() => {
    if (data && activeConversationId) setMessages(activeConversationId, data);
  }, [data, activeConversationId]);

  useEffect(() => {
    if (isAtBottom || pendingUploads.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages.length, pendingUploads.length, isAtBottom]);

  useEffect(() => {
    if (!activeConversationId) return;
    const socket = getSocket(accessToken);
    socket.emit("conversation:join", activeConversationId);
    api.post(`/messages/conversations/${activeConversationId}/read`);
  }, [activeConversationId]);

  useEffect(() => {
    if (editingMessage) {
      setDraft(editingMessage.content || "");
    }
  }, [editingMessage]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setReplyToMessage(null);
        setEditingMessage(null);
        setDraft("");
      }
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  function handleTyping() {
    if (!activeConversationId) return;
    const socket = getSocket(accessToken);
    
    const now = Date.now();
    if (now - lastTypedEmitted.current > 1500) {
      socket.emit("typing:start", { conversationId: activeConversationId });
      lastTypedEmitted.current = now;
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId: activeConversationId });
    }, 1500);
  }

  const uploadAudio = async (blob: Blob): Promise<string> => {
    const sigRes = await api.get("/upload/signature");
    const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data;

    const formData = new FormData();
    formData.append("file", blob, "voice.webm");
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Cloudinary upload failed");
    return data.secure_url;
  };

  const handleSendVoiceNote = async () => {
    const audioBlob = await stopRecording();
    if (!audioBlob) return;
    try {
      setIsSending(true);
      const secureUrl = await uploadAudio(audioBlob);
      // Send the VOICE note message
      const socket = getSocket(accessToken);
      if (socket && activeConversationId) {
        socket.emit("message:send", {
          conversationId: activeConversationId,
          type: "VOICE",
          mediaUrl: secureUrl,
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload voice note.");
    } finally {
      setIsSending(false);
    }
  };

  async function sendMessage(content: string = draft, type: "TEXT" | "IMAGE" | "VOICE" = "TEXT", mediaUrl?: string, isViewOnce?: boolean) {
    if ((!content.trim() && type === "TEXT") || !activeConversationId) return;
    
    setIsSending(true);

    if (editingMessage && type === "TEXT") {
      await api.patch(`/messages/${editingMessage.id}`, { content });
      setEditingMessage(null);
      setDraft("");
      setShowEmojiPicker(false);
      setTimeout(() => {
        setIsSending(false);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      const replyToId = replyToMessage?.id;
      const currentReplyTo = replyToMessage;
      if (type === "TEXT") {
        setReplyToMessage(null);
        setDraft("");
      }
      
      const tempId = crypto.randomUUID();
      const user = useAuthStore.getState().user!;
      
      const optimisticMsg: Message = {
        id: tempId,
        tempId: tempId,
        conversationId: activeConversationId,
        senderId: user.id,
        type,
        content: content || null,
        mediaUrl: mediaUrl || null,
        isEdited: false,
        isDeleted: false,
        isViewOnce,
        createdAt: new Date().toISOString(),
        status: "sending",
        sender: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        },
        replyTo: currentReplyTo,
      };
      
      addMessage(optimisticMsg);
      
      setShowEmojiPicker(false);
      setTimeout(() => {
        setIsSending(false);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      if (isOffline) {
        await enqueue(tempId, activeConversationId, content || null, type, mediaUrl || null, replyToId || null, isViewOnce);
        return;
      }

      try {
        const res = await api.post("/messages", { conversationId: activeConversationId, content, type, mediaUrl, replyToId, isViewOnce });
        useChatStore.getState().replaceOptimisticMessage(activeConversationId, tempId, res.data.message);
      } catch (err) {
        console.error("Failed to send message", err);
        useChatStore.getState().setMessageStatus(activeConversationId, tempId, "failed");
      }
    }
  }

  // --- Image Upload Handlers ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
    e.target.value = ""; // Reset
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imageFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      if (imageFiles.length > 0) setSelectedFiles(imageFiles);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        e.preventDefault();
        setSelectedFiles(imageFiles);
      }
    }
  };

  const handleImageIconClick = async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Prompt,
        });
        if (image.webPath) {
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          const file = new File([blob], "image.jpg", { type: "image/jpeg" });
          setSelectedFiles([file]);
        }
        return;
      }
    } catch (e) {
      console.log("Capacitor camera check or selection error", e);
    }
    fileInputRef.current?.click();
  };

  const handleSendImages = async (filesWithCaptions: { file: File; caption: string; isViewOnce?: boolean }[]) => {
    setSelectedFiles([]);
    if (!activeConversationId) return;

    for (const item of filesWithCaptions) {
      // 1. Check size limit (20MB)
      if (item.file.size > 20 * 1024 * 1024) {
        alert(`File ${item.file.name} is too large. Max 20MB allowed.`);
        continue;
      }
      // 2. Add to pending uploads (shows temporary UI bubble)
      const { tempId } = addPendingUpload(item.file, item.caption, item.isViewOnce);
      
      // 3. Start upload
      uploadFile(item.file, tempId, item.caption, async (secureUrl, tId, cap) => {
        // On success, send actual message
        await sendMessage(cap || "", "IMAGE", secureUrl, item.isViewOnce);
        // Remove pending bubble
        removePendingUpload(tId);
      }, (err, tId) => {
        console.error("Upload failed for", item.file.name, err);
        // Error state is kept in pendingUploads so user can see it failed
      });
    }
  };


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
            animate={{ 
              y: [0, -8, 0],
              rotate: [-2, 2, -2]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
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
    <main 
      className={`chat glass h-full w-full flex flex-col relative ${isDragging ? "ring-2 ring-accent bg-accent/5" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop Zone Overlay */}
      <AnimatePresence>
        {showSharedMedia && activeConversationId && (
          <SharedMediaModal 
            conversationId={activeConversationId} 
            onClose={() => setShowSharedMedia(false)} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none rounded-2xl"
          >
            <div className="glass p-8 rounded-3xl flex flex-col items-center">
              <ImageIcon size={48} className="text-white/60 mb-4" />
              <p className="text-lg font-medium text-white">Drop images here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      {selectedFiles.length > 0 && (
        <ImagePreviewModal
          files={selectedFiles}
          onClose={() => setSelectedFiles([])}
          onSend={handleSendImages}
        />
      )}

      <div className="chat-header h-[64px] shrink-0">
        <button 
          onClick={() => setActiveConversation(null)}
          className="md:hidden mr-2 p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <ArrowLeft size={18} />
        </button>
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 2 }} 
          className="relative cursor-pointer shadow-md shrink-0 rounded-[14px] overflow-hidden"
          onClick={() => {
            if (conversation.isGroup && conversation.group) {
              setGroupSettingsOpen(true, conversation.group.id);
            } else if (conversation.otherUser) {
              router.push(`/profile?u=${conversation.otherUser.username}`);
            }
          }}
        >
          <Avatar src={avatar} name={name} className="h-10 w-10 border-none" />
          {isOnline && <span className="dot" />}
        </motion.div>
        <div 
          className="cursor-pointer"
          onClick={() => {
            if (conversation.isGroup && conversation.group) {
              setGroupSettingsOpen(true, conversation.group.id);
            } else if (conversation.otherUser) {
              router.push(`/profile?u=${conversation.otherUser.username}`);
            }
          }}
        >
          <div className="chat-title leading-tight hover:underline">{name}</div>
          <div className="chat-sub">
            {typingInThisChat.length > 0 ? (
              <div className="flex items-center gap-1 mt-0.5">
                <motion.span 
                  animate={{ y: [0, -2, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} 
                  className="w-1 h-1 bg-white/50 rounded-full" 
                />
                <motion.span 
                  animate={{ y: [0, -2, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} 
                  className="w-1 h-1 bg-white/50 rounded-full" 
                />
                <motion.span 
                  animate={{ y: [0, -2, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} 
                  className="w-1 h-1 bg-white/50 rounded-full" 
                />
              </div>
            ) : isOnline ? "online" : "offline"}
          </div>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          <button 
            onClick={() => setShowSharedMedia(true)}
            className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition"
            title="Shared Media"
          >
            <ImageIcon size={20} />
          </button>
        </div>
      </div>

      <div className="messages" ref={containerRef}>
        <div style={{ paddingTop, paddingBottom }}>
          <AnimatePresence initial={false}>
            {visibleItems.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                onReply={setReplyToMessage} 
                onEdit={setEditingMessage}
              />
            ))}
            
            {/* Render Pending Uploads as mock bubbles */}
            {pendingUploads.map((up) => (
              <MessageBubble
                key={up.id}
                message={{
                  id: up.id,
                  conversationId: activeConversationId!,
                  senderId: useAuthStore.getState().user!.id,
                  type: "IMAGE",
                  content: up.caption || null,
                  mediaUrl: up.previewUrl,
                  createdAt: new Date().toISOString(),
                  isEdited: false,
                  isDeleted: false,
                  sender: {
                    id: useAuthStore.getState().user!.id,
                    username: useAuthStore.getState().user!.username,
                    displayName: useAuthStore.getState().user!.displayName,
                    avatarUrl: useAuthStore.getState().user!.avatarUrl
                  },
                }}
                pendingUpload={up}
                onCancelUpload={cancelUpload}
                onRetryUpload={retryUpload}
              />
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
        {editingMessage && (
          <div className="mb-3 flex items-center justify-between rounded-[20px] bg-white/5 border border-white/10 px-5 py-3 text-[13px] text-white/60">
            <div className="flex flex-col">
              <span className="text-white font-medium mb-1 flex items-center gap-2"><Edit2 size={12}/> Editing Message</span>
              <span className="truncate max-w-[200px] sm:max-w-[400px]">{editingMessage.content}</span>
            </div>
            <button onClick={() => { setEditingMessage(null); setDraft(""); }} className="hover:text-white transition bg-white/5 p-1.5 rounded-full">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="composer-glass">
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          <motion.div whileHover={{ scale: 1.1, filter: "brightness(1.2)" }} className="icon-btn" onClick={handleImageIconClick}>
            <ImageIcon size={18} />
          </motion.div>
          <textarea
            value={draft}
            rows={1}
            onPaste={handlePaste}
            onChange={(e) => {
              const val = e.target.value;
              setDraft(val);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
              handleTyping();

              // Mention logic
              const lastAtPos = val.lastIndexOf("@");
              if (lastAtPos !== -1 && conversation?.isGroup) {
                const query = val.slice(lastAtPos + 1);
                if (!query.includes(" ")) {
                  setMentionQuery(query);
                } else {
                  setMentionQuery(null);
                }
              } else {
                setMentionQuery(null);
              }
            }}
            onKeyDown={(e) => {
              if (mentionQuery !== null && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter")) {
                // Let the suggestion box handle it if we want, but for now just prevent default if enter
                if (e.key === "Enter") {
                   e.preventDefault();
                   // Wait for user to select from suggestions
                   return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                e.currentTarget.style.height = "auto";
              }
            }}
            placeholder="say something..."
            className="flex-1 bg-transparent border-none outline-none text-white font-inter text-[14px] min-h-[22px] max-h-[120px] resize-none py-1 placeholder:text-white/30 transition-opacity focus:placeholder:opacity-50"
          />
          <div className="relative">
            {conversation?.isGroup && (
              <MentionSuggestions
                query={mentionQuery || ""}
                isOpen={mentionQuery !== null}
                users={conversation.participants?.map(p => p.user) || []}
                onSelect={(username) => {
                  const lastAtPos = draft.lastIndexOf("@");
                  const newDraft = draft.slice(0, lastAtPos) + `@${username} ` + draft.slice(lastAtPos + (mentionQuery?.length || 0) + 1);
                  setDraft(newDraft);
                  setMentionQuery(null);
                }}
              />
            )}
            <motion.div 
              whileHover={{ scale: 1.1, filter: "brightness(1.2)" }} 
              className="icon-btn hidden sm:flex cursor-pointer"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </motion.div>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-12 right-0 z-50 shadow-2xl"
                >
                  <EmojiPicker 
                    theme={Theme.DARK} 
                    onEmojiClick={(emoji) => setDraft((prev) => prev + emoji.emoji)}
                    autoFocusSearch={false}
                    lazyLoadEmojis={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
           <motion.div 
            whileHover={{ scale: 1.1, filter: "brightness(1.2)" }} 
            className="icon-btn flex cursor-pointer"
            onClick={startRecording}
          >
            <Mic size={18} />
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05, rotate: -5, filter: "brightness(1.2)" }}
            whileTap={{ scale: 0.9 }}
            animate={isSending ? { scale: [1, 1.2, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={() => sendMessage()}
            className="send-btn"
          >
            <Send size={16} color="#ffffff" />
          </motion.button>
        </div>
      </div>

      <VoiceRecorder
        isRecording={isRecording}
        recordingTime={recordingTime}
        isPaused={isPaused}
        onPause={pauseRecording}
        onResume={resumeRecording}
        onCancel={cancelRecording}
        onSend={handleSendVoiceNote}
      />
    </main>
  );
}
