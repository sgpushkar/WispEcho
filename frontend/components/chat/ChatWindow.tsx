"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Image as ImageIcon,
  ArrowLeft,
  Mic,
  X,
  Edit2,
  Bell,
  BellOff,
  Timer,
  Check,
  MoreVertical,
  User,
  Palette,
  CheckSquare,
  Smile,
  Clock,
  BarChart2,
  Plus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useChatStore, Message, useChatHasHydrated } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/useToast";
import { getSocket } from "@/lib/socket";
import { MessageBubble } from "./MessageBubble";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";
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
import { WallpaperPickerModal } from "./WallpaperPickerModal";
import { ChatBackground } from "@/lib/themes";
import { isToday, isYesterday, format as formatDate, isSameDay } from "date-fns";
import { MessageScheduler } from "./MessageScheduler";
import { PollCreator } from "./PollCreator";
import { ForwardModal } from "./ForwardModal";
import { PinnedMessages } from "./PinnedMessages";

function formatDayDivider(dateStr: string) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    const currentYear = new Date().getFullYear();
    const msgYear = date.getFullYear();
    if (currentYear === msgYear) {
      return formatDate(date, "EEEE, MMMM d");
    }
    return formatDate(date, "EEEE, MMMM d, yyyy");
  } catch {
    return null;
  }
}

export function ChatWindow() {
  const router = useRouter();
  const { setGroupSettingsOpen, applyCustomTheme, themeId: activeThemeId, forwardModalOpen, messageToForward, closeForwardModal } = useUIStore();
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const { success, error: toastError, warning } = useToast();
  const { activeConversationId, setActiveConversation, conversations, messages, setMessages, typingUsers, onlineUsers, addMessage, updateParticipantChatBg, removeMessage } = useChatStore();
  
  const [draft, setDraft] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showSharedMedia, setShowSharedMedia] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // Conversation Settings
  const [isMuted, setIsMuted] = useState(false);
  const [disappearAfter, setDisappearAfter] = useState("OFF");
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Image Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { pendingUploads, addPendingUpload, uploadFile, removePendingUpload, cancelUpload, retryUpload } = useImageUpload();
  const { enqueue } = useOfflineQueue();
  const isOffline = useChatStore((s) => s.isOffline);

  const isClient = useChatHasHydrated();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const conversation = conversations.find((c) => c.id === activeConversationId);
  const conversationMessages = isClient ? (activeConversationId ? messages[activeConversationId] || [] : []) : [];
  const typingInThisChat = activeConversationId
    ? Array.from(typingUsers[activeConversationId] || []).filter(id => id !== currentUserId)
    : [];

  const { data } = useQuery({
    enabled: !!activeConversationId,
    queryKey: ["messages", activeConversationId],
    queryFn: async () =>
      (await api.get(`/messages/conversations/${activeConversationId}/messages`)).data.messages as Message[],
  });

  const { containerRef, visibleItems, paddingTop, paddingBottom, isAtBottom } = useVirtualScroll({ items: conversationMessages });

  const deleteMessageMutation = useMutation({
    mutationFn: async ({ messageId, forEveryone }: { messageId: string; forEveryone: boolean }) =>
      api.delete(`/messages/${messageId}`, { data: { forEveryone } }),
    onMutate: ({ messageId }) => {
      const currentMessages = useChatStore.getState().messages[activeConversationId!] || [];
      const index = currentMessages.findIndex((m) => m.id === messageId);
      const previousMessage = currentMessages[index];
      setMessages(activeConversationId!, currentMessages.filter((m) => m.id !== messageId));
      return { previousMessage, index };
    },
    onError: (_err, variables, context: any) => {
      toastError("Failed to delete message");
      if (context?.previousMessage) {
        const currentMessages = useChatStore.getState().messages[activeConversationId!] || [];
        const newMessages = [...currentMessages];
        newMessages.splice(context.index, 0, context.previousMessage);
        setMessages(activeConversationId!, newMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      }
    },
  });

  const handleDeleteMessage = (messageId: string, forEveryone: boolean) => {
    deleteMessageMutation.mutate({ messageId, forEveryone });
  };

  useEffect(() => {
    if (data && activeConversationId) setMessages(activeConversationId, data);
  }, [data, activeConversationId]);

  useEffect(() => {
    // Scroll to bottom immediately on initial load or conversation switch
    if (conversationMessages.length > 0 && isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages.length, pendingUploads.length, isAtBottom]);

  useEffect(() => {
    // Jump to bottom instantly when switching chats
    if (activeConversationId) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    const socket = getSocket(accessToken);
    socket.emit("conversation:join", activeConversationId);
    api.post(`/messages/conversations/${activeConversationId}/read`);

    // Fetch conversation preferences
    api.get(`/notifications/preferences`).then(res => {
      const prefs = res.data.preferences?.find((p: any) => p.conversationId === activeConversationId);
      setIsMuted(prefs ? prefs.isMuted : false);
    }).catch(console.error);
    
    const currConv = useChatStore.getState().conversations.find(c => c.id === activeConversationId);
    if (currConv) setDisappearAfter(currConv.disappearAfter || "OFF");

    // Prevent transient state leaking when switching conversations
    setReplyToMessage(null);
    setEditingMessage(null);
    setDraft("");
    setMentionQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [activeConversationId]);

  useEffect(() => {
    if (editingMessage) {
      setDraft(editingMessage.content || "");
    }
  }, [editingMessage]);
  const conversationBg = conversation?.participants?.find((p) => p.userId === currentUserId || p.user.id === currentUserId)?.chatBg;

  useEffect(() => {
    if (conversationBg) {
      document.documentElement.style.setProperty("--chat-bg-type", conversationBg.type);
      let val = conversationBg.value;
      if (conversationBg.type === 'image') {
        val = val.startsWith('url(') ? val : `url(${val})`;
        val = `linear-gradient(var(--bg-overlay, rgba(0,0,0,0.5)), var(--bg-overlay, rgba(0,0,0,0.5))), ${val}`;
      }
      document.documentElement.style.setProperty("--chat-bg-value", val);
    } else {
      const globalTheme = useUIStore.getState().getActiveTheme();
      if (globalTheme.chatBackground) {
        document.documentElement.style.setProperty("--chat-bg-type", globalTheme.chatBackground.type);
        let val = globalTheme.chatBackground.value;
        if (globalTheme.chatBackground.type === 'image') {
          val = val.startsWith('url(') ? val : `url(${val})`;
          val = `linear-gradient(var(--bg-overlay, rgba(0,0,0,0.5)), var(--bg-overlay, rgba(0,0,0,0.5))), ${val}`;
        }
        document.documentElement.style.setProperty("--chat-bg-value", val);
      } else {
        document.documentElement.style.removeProperty("--chat-bg-type");
        document.documentElement.style.removeProperty("--chat-bg-value");
      }
    }
  }, [conversationBg, activeConversationId, activeThemeId]);

  const handleApplyGlobal = (bg: ChatBackground | null) => {
    const globalTheme = useUIStore.getState().getActiveTheme();
    applyCustomTheme({ ...globalTheme, id: globalTheme.id || "default", name: globalTheme.name || "Custom", chatBg: bg });
    setShowWallpaperPicker(false);
  };

  const handleApplyIndividual = async (bg: ChatBackground | null) => {
    if (!activeConversationId || !currentUserId) return;
    try {
      await api.patch(`/messages/conversations/${activeConversationId}/participant`, { chatBg: bg });
      updateParticipantChatBg(activeConversationId, currentUserId, bg);
      setShowWallpaperPicker(false);
    } catch (error) {
      console.error(error);
      toastError("Failed to update chat background");
    }
  };

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setReplyToMessage(null);
        setEditingMessage(null);
        setDraft("");
        setShowMenu(false);
        setShowShareMenu(false);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    }
    if (showMenu || showShareMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu, showShareMenu]);

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
    }, 2000);
  }

  const uploadAudio = async (blob: Blob): Promise<string> => {
    // Request a signature specifically for audio uploads
    const sigRes = await api.get("/upload/signature?type=audio");
    const { signature, timestamp, cloudName, apiKey, folder, resourceType } = sigRes.data;

    const formData = new FormData();
    // Derive file extension from the actual MIME type so Cloudinary can process it correctly
    const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
    formData.append("file", blob, `voice.${ext}`);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);

    // Cloudinary uses /video/upload for both video AND audio files
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
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
      // Use sendMessage (api.post) — the socket has no "message:send" listener server-side
      await sendMessage("", "VOICE", secureUrl);
    } catch (err) {
      console.error(err);
      toastError("Failed to upload voice note.");
    } finally {
      setIsSending(false);
    }
  };


  async function sendMessage(content: string = draft, type: "TEXT" | "IMAGE" | "VOICE" | "POLL" = "TEXT", mediaUrl?: string, isViewOnce?: boolean, mediaPublicId?: string, scheduledAt?: Date, pollOptions?: string[]) {
    if ((!content.trim() && type === "TEXT") || !activeConversationId) return;
    
    setIsSending(true);

    if (editingMessage && type === "TEXT") {
      // Optimistic update for snappy UX
      useChatStore.getState().updateMessage({
        id: editingMessage.id,
        conversationId: activeConversationId,
        content,
        isEdited: true
      });
      await api.patch(`/messages/${editingMessage.id}`, { content });
      setEditingMessage(null);
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
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
        if (textareaRef.current) textareaRef.current.style.height = "auto";
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
        scheduledAt: scheduledAt?.toISOString() || null,
        createdAt: new Date().toISOString(),
        status: "sending",
        sender: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        },
        replyTo: currentReplyTo,
        poll: type === "POLL" && pollOptions ? {
          id: tempId,
          messageId: tempId,
          question: content || "Poll",
          options: pollOptions,
          results: pollOptions.map((opt, idx) => ({ index: idx, label: opt, votes: 0, voters: [] })),
          totalVotes: 0,
          myVote: null,
          closedAt: null,
          endsAt: null,
        } : null,
      };
      
      addMessage(optimisticMsg);
      
      setShowEmojiPicker(false);
      setTimeout(() => {
        setIsSending(false);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);

      if (isOffline) {
        await enqueue(tempId, activeConversationId, content || null, type as "TEXT" | "IMAGE" | "VOICE", mediaUrl || null, replyToId || null, isViewOnce);
        return;
      }

      try {
        const payload: any = {
          conversationId: activeConversationId,
          content,
          type,
          mediaUrl,
          ...(mediaPublicId ? { mediaPublicId } : {}),
          replyToId,
          isViewOnce,
        };
        if (scheduledAt) payload.scheduledAt = scheduledAt.toISOString();
        if (type === "POLL" && pollOptions) payload.pollOptions = pollOptions;

        const res = await api.post("/messages", { ...payload });
        useChatStore.getState().replaceOptimisticMessage(activeConversationId, tempId, res.data.message);
      } catch (err) {
        console.error("Failed to send message", err);
        useChatStore.getState().setMessageStatus(activeConversationId, tempId, "failed");
      }
    }
  }

  // --- Image Upload Handlers ---

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleBgContextMenu = (e: React.MouseEvent) => {
    // Check if clicked exactly on the background, not on a child bubble
    if ((e.target as HTMLElement).closest('.bubble-container') || (e.target as HTMLElement).closest('.row')) return;
    e.preventDefault();
    setShowWallpaperPicker(true);
  };

  const handlePointerDownBg = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.bubble-container') || (e.target as HTMLElement).closest('.row')) return;
    if (e.pointerType === "mouse" && e.button !== 0) return; // Right click handled by contextMenu
    
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setShowWallpaperPicker(true);
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

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
        warning(`"${item.file.name}" is too large. Max 20 MB allowed.`);
        continue;
      }
      // 2. Add to pending uploads (shows temporary UI bubble)
      const { tempId } = addPendingUpload(item.file, item.caption, item.isViewOnce);
      
      // 3. Start upload — onComplete now receives publicId (Cloudinary public_id)
      uploadFile(item.file, tempId, item.caption, async (secureUrl, tId, cap, publicId) => {
        // On success, send actual message with mediaPublicId for secure delivery
        await sendMessage(cap || "", "IMAGE", secureUrl, item.isViewOnce, publicId);
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

      <div className="chat-header h-[64px] shrink-0 border-b border-white/5 flex items-center justify-between px-3.5 sm:px-6 z-20">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={() => setActiveConversation(null)}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            className="relative cursor-pointer shadow-md shrink-0 rounded-2xl overflow-hidden"
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
            className="cursor-pointer min-w-0 flex-1"
            onClick={() => {
              if (conversation.isGroup && conversation.group) {
                setGroupSettingsOpen(true, conversation.group.id);
              } else if (conversation.otherUser) {
                router.push(`/profile?u=${conversation.otherUser.username}`);
              }
            }}
          >
            <div className="chat-title font-semibold text-white text-sm sm:text-base leading-tight truncate hover:underline">{name}</div>
            <div className="chat-sub text-xs text-white/50 truncate mt-0.5">
              {typingInThisChat.length > 0 ? (
                <span className="text-accent font-medium animate-pulse">typing...</span>
              ) : conversation.isGroup ? (
                `${conversation.participants?.length || 0} members`
              ) : isOnline ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : (
                "Offline"
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0 relative">
          {isMultiSelectMode ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 font-medium mr-1 hidden sm:inline">
                {selectedMessageIds.size} selected
              </span>
              <button 
                onClick={() => {
                  setIsMultiSelectMode(false);
                  setSelectedMessageIds(new Set());
                }}
                className="text-xs bg-white/10 px-3 py-1.5 rounded-full text-white/70 hover:text-white transition"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (selectedMessageIds.size === 0) return;
                  const currentUserId = useAuthStore.getState().user?.id;
                  const allMine = Array.from(selectedMessageIds).every(id => {
                    const msg = conversationMessages.find(m => m.id === id);
                    return msg && msg.senderId === currentUserId;
                  });

                  let forEveryone = false;
                  if (allMine) {
                    forEveryone = window.confirm("Delete for everyone? Click OK to delete for everyone, or Cancel to delete just for you.");
                  } else {
                    if (!window.confirm("Delete selected messages for you?")) return;
                  }

                  try {
                    await api.delete("/messages/bulk", {
                      data: { messageIds: Array.from(selectedMessageIds), forEveryone }
                    });
                    Array.from(selectedMessageIds).forEach(id => removeMessage(activeConversationId!, id));
                    setSelectedMessageIds(new Set());
                    setIsMultiSelectMode(false);
                  } catch (err: any) {
                    toastError(err.response?.data?.error || "Failed to delete messages");
                  }
                }}
                className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full hover:bg-red-500/30 transition"
              >
                Delete ({selectedMessageIds.size})
              </button>
              <button 
                onClick={() => {
                  if (selectedMessageIds.size > 0) {
                    // Open the forward modal via UIStore (single source of truth).
                    // messageToForward=null signals multi-select mode;
                    // the ForwardModal receives selectedMessageIds via the prop below.
                    useUIStore.getState().openForwardModal(null);
                  }
                }}
                className="text-xs bg-accent text-white px-3 py-1.5 rounded-full hover:bg-accent/90 transition"
              >
                Forward
              </button>
            </div>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className={`p-2 rounded-full transition ${showMenu ? "bg-white/15 text-white" : "hover:bg-white/10 text-white/60 hover:text-white"}`}
                title="Options"
              >
                <MoreVertical size={20} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-[#141416]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 z-50 flex flex-col gap-0.5"
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (conversation.isGroup && conversation.group) {
                          setGroupSettingsOpen(true, conversation.group.id);
                        } else if (conversation.otherUser) {
                          router.push(`/profile?u=${conversation.otherUser.username}`);
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition text-left"
                    >
                      <User size={15} className="text-white/50 shrink-0" />
                      <span>{conversation.isGroup ? "Group Details" : "View Profile"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowSharedMedia(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition text-left"
                    >
                      <ImageIcon size={15} className="text-white/50 shrink-0" />
                      <span>Shared Media</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowWallpaperPicker(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition text-left"
                    >
                      <Palette size={15} className="text-white/50 shrink-0" />
                      <span>Chat Wallpaper</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsMultiSelectMode(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition text-left"
                    >
                      <CheckSquare size={15} className="text-white/50 shrink-0" />
                      <span>Select Messages</span>
                    </button>

                    <button
                      onClick={async () => {
                        setShowMenu(false);
                        try {
                          await api.patch(`/notifications/${activeConversationId}/mute`);
                          setIsMuted(!isMuted);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="flex items-center justify-between px-3 py-2.5 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        {isMuted ? <BellOff size={15} className="text-red-400 shrink-0" /> : <Bell size={15} className="text-white/50 shrink-0" />}
                        <span>{isMuted ? "Unmute Notifications" : "Mute Notifications"}</span>
                      </div>
                      {isMuted && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-semibold">MUTED</span>}
                    </button>

                    <div className="h-[1px] bg-white/5 my-1" />

                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                      <Timer size={12} className="text-white/40" />
                      <span>Disappearing Messages</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 px-1.5 pb-1">
                      {[
                        { label: "Off", val: "OFF" },
                        { label: "24h", val: "H24" },
                        { label: "7d", val: "D7" },
                        { label: "30d", val: "D30" },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          onClick={async () => {
                            try {
                              await api.patch(`/messages/conversations/${activeConversationId}/disappear`, { disappearAfter: opt.val });
                              setDisappearAfter(opt.val);
                              setShowMenu(false);
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className={`py-1 text-center rounded-lg text-xs font-medium transition ${
                            disappearAfter === opt.val
                              ? "bg-accent text-white"
                              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <PinnedMessages conversationId={activeConversationId!} />

      <div
        className="messages"
        ref={containerRef}
        onContextMenu={handleBgContextMenu}
        onPointerDown={handlePointerDownBg}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
      >
        <div className="max-w-4xl mx-auto w-full" style={{ paddingTop, paddingBottom }}>
          <AnimatePresence initial={false}>
            {visibleItems.map((msg, index) => {
              const prevMsg = visibleItems[index - 1];
              const showDateDivider =
                !prevMsg ||
                !isSameDay(new Date(msg.createdAt), new Date(prevMsg.createdAt));

              return (
                <div key={msg.id} className="flex flex-col">
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-3 select-none">
                      <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3.5 py-1 rounded-full text-[11px] font-medium text-white/70 shadow-sm">
                        {formatDayDivider(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageBubble 
                    message={msg} 
                    isGroup={conversation?.isGroup}
                    onReply={setReplyToMessage} 
                    onEdit={setEditingMessage}
                    isSelectable={isMultiSelectMode}
                    isSelected={selectedMessageIds.has(msg.id)}
                    onToggleSelect={(id) => {
                      setSelectedMessageIds(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(id)) newSet.delete(id);
                        else newSet.add(id);
                        return newSet;
                      });
                    }}
                  />
                </div>
              );
            })}
            
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

      <div className="composer max-w-4xl mx-auto w-full">
        {replyToMessage && (
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 text-[13px] text-white/60 backdrop-blur-md">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-white font-medium text-xs mb-0.5 truncate">Replying to {replyToMessage.sender?.displayName}</span>
              <span className="truncate text-xs text-white/70">{replyToMessage.content}</span>
            </div>
            <button onClick={() => setReplyToMessage(null)} className="hover:text-white transition bg-white/5 hover:bg-white/10 p-1.5 rounded-full shrink-0">
              <X size={14} />
            </button>
          </div>
        )}
        {editingMessage && (
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 text-[13px] text-white/60 backdrop-blur-md">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-white font-medium text-xs mb-0.5 flex items-center gap-1.5"><Edit2 size={12} className="text-accent"/> Editing Message</span>
              <span className="truncate text-xs text-white/70">{editingMessage.content}</span>
            </div>
            <button onClick={() => { setEditingMessage(null); setDraft(""); }} className="hover:text-white transition bg-white/5 hover:bg-white/10 p-1.5 rounded-full shrink-0">
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

          <div className="relative shrink-0" ref={shareMenuRef}>
            <button
              type="button"
              className={`icon-btn shrink-0 transition-transform duration-200 ${
                showShareMenu ? "bg-white/15 text-white rotate-45" : "hover:bg-white/10 text-white/70 hover:text-white"
              }`}
              onClick={() => setShowShareMenu((prev) => !prev)}
              title="Share content (Image, Poll, Schedule, Voice)"
            >
              <Plus size={20} />
            </button>

            <AnimatePresence>
              {showShareMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: -8 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute bottom-full left-0 mb-2 w-64 sm:w-72 rounded-2xl bg-[#151518]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-2 z-50 flex flex-col gap-1 select-none"
                >
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Share Content
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowShareMenu(false);
                      handleImageIconClick();
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <ImageIcon size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white group-hover:text-white">Photo & Video</span>
                      <span className="text-[11px] text-white/50 truncate">Share images and screenshots</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowShareMenu(false);
                      setShowPollCreator(true);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <BarChart2 size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white group-hover:text-white">Create Poll</span>
                      <span className="text-[11px] text-white/50 truncate">Ask a question and collect votes</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowShareMenu(false);
                      setShowScheduler(true);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Clock size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white group-hover:text-white">Schedule Message</span>
                      <span className="text-[11px] text-white/50 truncate">Send at a specific date & time</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowShareMenu(false);
                      startRecording();
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Mic size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white group-hover:text-white">Voice Note</span>
                      <span className="text-[11px] text-white/50 truncate">Record and send audio</span>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <textarea
            ref={textareaRef}
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
                if (e.key === "Enter") {
                   e.preventDefault();
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
            className="flex-1 bg-transparent border-none outline-none text-white font-inter text-[14px] min-h-[22px] max-h-[120px] resize-none py-1.5 placeholder:text-white/30 transition-opacity focus:placeholder:opacity-50"
          />

          <div className="flex items-center gap-0.5 shrink-0 relative">
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
                  if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.style.height = "auto";
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                      }
                    }, 0);
                  }
                }}
              />
            )}

            <button
              type="button"
              className="icon-btn flex shrink-0"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              title="Insert Emoji"
            >
              <Smile size={18} />
            </button>

            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
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

            <button
              type="button"
              className="icon-btn flex shrink-0"
              onClick={startRecording}
              title="Voice Message"
            >
              <Mic size={18} />
            </button>

            <motion.button
              whileHover={{ scale: 1.05, rotate: -4 }}
              whileTap={{ scale: 0.92 }}
              animate={isSending ? { scale: [1, 1.15, 1] } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => sendMessage()}
              className="send-btn shrink-0 ml-1"
              title="Send"
            >
              <Send size={15} color="#ffffff" />
            </motion.button>
          </div>
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

      <AnimatePresence>
        {showWallpaperPicker && (
          <WallpaperPickerModal
            onClose={() => setShowWallpaperPicker(false)}
            onApplyGlobal={handleApplyGlobal}
            onApplyIndividual={handleApplyIndividual}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduler && (
          <MessageScheduler
            onClose={() => setShowScheduler(false)}
            onSchedule={(date) => {
              sendMessage(draft, "TEXT", undefined, undefined, undefined, date);
              setShowScheduler(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPollCreator && (
          <PollCreator
            onClose={() => setShowPollCreator(false)}
            onSubmit={(question, options) => {
              sendMessage(question, "POLL", undefined, undefined, undefined, undefined, options);
              setShowPollCreator(false);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {forwardModalOpen && activeConversationId && (
          <ForwardModal
            messageIds={
              messageToForward?.id
                ? [messageToForward.id]
                : Array.from(selectedMessageIds)
            }
            onClose={() => {
              closeForwardModal();
              setIsMultiSelectMode(false);
              setSelectedMessageIds(new Set());
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
