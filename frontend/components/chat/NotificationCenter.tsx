"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  UserPlus,
  UserCheck,
  Heart,
  Users,
  Megaphone,
  Sparkles,
  MessageCircle,
  AtSign,
  X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useUIStore } from "@/store/useUIStore";
import { formatDistanceToNowStrict } from "date-fns";
import { Avatar } from "@/components/ui/Avatar";
import { useChatStore } from "@/store/useChatStore";

interface InboxNotification {
  id: string;
  type: string; // FRIEND_REQUEST | FRIEND_ACCEPTED | MESSAGE | MENTION | REACTION | GROUP_INVITE | BROADCAST | SUBSCRIPTION
  payload: any;
  isRead: boolean;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case "FRIEND_REQUEST":
      return <UserPlus size={14} className="text-blue-400" />;
    case "FRIEND_ACCEPTED":
      return <UserCheck size={14} className="text-emerald-400" />;
    case "MENTION":
      return <AtSign size={14} className="text-amber-400" />;
    case "REACTION":
      return <Heart size={14} className="text-rose-400" />;
    case "GROUP_INVITE":
      return <Users size={14} className="text-purple-400" />;
    case "BROADCAST":
      return <Megaphone size={14} className="text-yellow-400" />;
    case "SUBSCRIPTION":
      return <Sparkles size={14} className="text-pink-400" />;
    default:
      return <MessageCircle size={14} className="text-white/60" />;
  }
}

function notifSummary(n: InboxNotification) {
  const p = n.payload || {};
  switch (n.type) {
    case "FRIEND_REQUEST":
      return `${p.from || "Someone"} sent you a friend request`;
    case "FRIEND_ACCEPTED":
      return p.message || `${p.from || "Someone"} accepted your friend request!`;
    case "MENTION":
      return p.message || `${p.from || "Someone"} mentioned you in a message`;
    case "REACTION":
      return p.message || `${p.from || "Someone"} reacted ${p.emoji || "👍"} to your message`;
    case "GROUP_INVITE":
      return p.message || `You were added to ${p.groupName || "a group"}`;
    case "BROADCAST":
      return p.message || p.body || "New announcement from Admin";
    case "SUBSCRIPTION":
      return p.message || "Your subscription status was updated";
    default:
      return p.message || "New notification";
  }
}

export function NotificationCenter({ isOpen, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { setFriendsOpen } = useUIStore();
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["inbox-notifications"],
    queryFn: async () => (await api.get("/inbox")).data as { notifications: InboxNotification[]; unreadCount: number },
    enabled: isOpen,
    refetchInterval: isOpen ? 15_000 : false,
    staleTime: 10_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/inbox/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.post("/inbox/mark-all-read"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-notifications"] }),
  });

  const deleteNotif = useMutation({
    mutationFn: async (id: string) => api.delete(`/inbox/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-notifications"] }),
  });

  const clearAll = useMutation({
    mutationFn: async () => api.delete("/inbox/clear-all"),
    onSuccess: () => {
      setConfirmClear(false);
      queryClient.invalidateQueries({ queryKey: ["inbox-notifications"] });
    },
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleNotifClick = (n: InboxNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.type === "FRIEND_REQUEST") {
      setFriendsOpen(true);
      onClose();
    } else if (n.payload?.conversationId) {
      setActiveConversation(n.payload.conversationId);
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="glass-strong bg-[#0f0f11]/90 relative flex h-[80vh] max-h-[620px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 shrink-0 bg-white/[0.02]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center">
                  <Bell size={13} className="text-white/80" />
                </div>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                    className="text-[11px] text-white/50 hover:text-white flex items-center gap-1.5 transition px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  confirmClear ? (
                    <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                      <span className="text-[10px] text-red-300">Clear all?</span>
                      <button
                        onClick={() => clearAll.mutate()}
                        disabled={clearAll.isPending}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="text-[10px] text-white/40 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="text-[11px] text-white/40 hover:text-red-400 flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-white/5"
                      title="Clear all notifications"
                    >
                      <Trash2 size={12} />
                      <span>Clear all</span>
                    </button>
                  )
                )}
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto custom-scrollbar flex-1 pb-4 divide-y divide-white/5">
              {isLoading && (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
                  ))}
                </div>
              )}

              {!isLoading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4 space-y-3">
                  <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                    <Bell size={26} className="text-white/20" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/70">You&apos;re all caught up!</p>
                    <p className="text-xs text-white/30 mt-1">No new notifications at this time.</p>
                  </div>
                </div>
              )}

              {!isLoading &&
                notifications.map((n) => {
                  const avatarUrl = n.payload?.avatarUrl;
                  const fromName = n.payload?.from || n.payload?.fromUsername;

                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`group flex items-start gap-3.5 px-5 py-3.5 hover:bg-white/[0.04] transition cursor-pointer ${
                        !n.isRead ? "bg-white/[0.02]" : ""
                      }`}
                      onClick={() => handleNotifClick(n)}
                    >
                      {/* Avatar or Icon */}
                      <div className="relative shrink-0 mt-0.5">
                        {avatarUrl ? (
                          <div className="relative">
                            <Avatar src={avatarUrl} name={fromName || "User"} className="h-9 w-9 rounded-full" />
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#121214] border border-white/10 flex items-center justify-center shadow-md">
                              <NotifIcon type={n.type} />
                            </div>
                          </div>
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <NotifIcon type={n.type} />
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-2">
                        <p className={`text-xs leading-relaxed ${n.isRead ? "text-white/60" : "text-white/90 font-medium"}`}>
                          {notifSummary(n)}
                        </p>
                        <p className="text-[10px] text-white/30 mt-1">
                          {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Actions & Read Status */}
                      <div className="flex items-center gap-1.5 shrink-0 self-center">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          {!n.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markRead.mutate(n.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                              title="Mark as read"
                            >
                              <Check size={13} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotif.mutate(n.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {!n.isRead && (
                          <div className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] shrink-0 ml-1" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
