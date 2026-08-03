"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bookmark, Trash2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { Avatar } from "@/components/ui/Avatar";
import { formatDistanceToNowStrict } from "date-fns";
import { useSecureImage } from "@/hooks/useSecureImage";

function SavedMessageImage({ messageId }: { messageId: string }) {
  const { url, loading } = useSecureImage({ messageId });
  if (loading) return <div className="h-20 w-20 rounded-xl bg-white/5 animate-pulse" />;
  if (!url) return null;
  return <img src={url} alt="" className="h-20 w-20 object-cover rounded-xl border border-white/10" />;
}

interface SavedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  isDeleted: boolean;
  savedAt: string;
  createdAt: string;
  sender: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  conversation: {
    id: string;
    isGroup: boolean;
    group?: { name: string } | null;
    participants?: { user: { id: string; username: string; displayName: string } }[];
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SavedMessagesModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const { data, isLoading } = useQuery({
    queryKey: ["saved-messages"],
    queryFn: async () => (await api.get("/messages/saved")).data.messages as SavedMessage[],
    enabled: isOpen,
  });

  const unsave = useMutation({
    mutationFn: async (messageId: string) => api.post(`/messages/${messageId}/save`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-messages"] }),
  });

  const handleGoToConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    onClose();
  };

  const getConversationName = (msg: SavedMessage) => {
    if (msg.conversation.isGroup) return msg.conversation.group?.name || "Group";
    const other = msg.conversation.participants?.find((p) => p.user.id !== currentUser?.id);
    return other?.user.displayName || "DM";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="glass relative flex h-[600px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 p-4 shrink-0">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Bookmark size={16} className="text-yellow-400" />
                Saved Messages
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-white/40 hover:bg-white/5 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading && (
                <div className="flex flex-col gap-3 p-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              )}

              {!isLoading && (!data || data.length === 0) && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                  <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Bookmark size={28} className="text-white/30" />
                  </div>
                  <p className="text-sm font-medium text-white/60">No saved messages yet</p>
                  <p className="text-xs text-white/30 max-w-[220px]">
                    Long-press any message and tap "Save" to bookmark it here.
                  </p>
                </div>
              )}

              {!isLoading && data && data.length > 0 && (
                <div className="p-3 space-y-2">
                  {data.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex items-start gap-3 rounded-xl bg-white/5 border border-white/5 p-3 hover:bg-white/[0.08] transition"
                    >
                      <Avatar
                        src={msg.sender.avatarUrl}
                        name={msg.sender.displayName}
                        className="h-9 w-9 rounded-full border-none shrink-0 text-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white truncate">
                            {msg.sender.displayName}
                          </span>
                          <span className="text-[10px] text-white/30 shrink-0">
                            in {getConversationName(msg)}
                          </span>
                          <span className="text-[10px] text-white/25 ml-auto shrink-0">
                            {formatDistanceToNowStrict(new Date(msg.createdAt), { addSuffix: true })}
                          </span>
                        </div>

                        {msg.isDeleted ? (
                          <p className="text-xs text-white/30 italic">This message was deleted</p>
                        ) : msg.type === "IMAGE" ? (
                          <SavedMessageImage messageId={msg.id} />
                        ) : msg.type === "VOICE" ? (
                          <p className="text-xs text-white/50 italic">🎤 Voice note</p>
                        ) : (
                          <p className="text-xs text-white/70 leading-relaxed line-clamp-3">{msg.content}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button
                          onClick={() => handleGoToConversation(msg.conversationId)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                          title="Go to conversation"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          onClick={() => unsave.mutate(msg.id)}
                          disabled={unsave.isPending}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition"
                          title="Unsave"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
