"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, UserPlus, MessageCircle, AtSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useUIStore } from "@/store/useUIStore";
import { formatDistanceToNowStrict } from "date-fns";
import { Avatar } from "@/components/ui/Avatar";

interface InboxNotification {
  id: string;
  type: string; // FRIEND_REQUEST | MESSAGE | MENTION | REACTION | GROUP_INVITE
  payload: any;
  isRead: boolean;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function NotifIcon({ type }: { type: string }) {
  if (type === "FRIEND_REQUEST") return <UserPlus size={14} className="text-blue-400" />;
  if (type === "MENTION") return <AtSign size={14} className="text-yellow-400" />;
  return <MessageCircle size={14} className="text-white/50" />;
}

function notifSummary(n: InboxNotification) {
  const p = n.payload || {};
  if (n.type === "FRIEND_REQUEST") return `${p.from || "Someone"} sent you a friend request`;
  if (n.type === "MENTION") return p.message || "You were mentioned";
  if (n.type === "REACTION") return `${p.from || "Someone"} reacted to your message`;
  if (n.type === "GROUP_INVITE") return `You were added to a group`;
  return p.message || "New notification";
}

export function NotificationCenter({ isOpen, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { setFriendsOpen } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ["inbox-notifications"],
    queryFn: async () => (await api.get("/inbox")).data as { notifications: InboxNotification[]; unreadCount: number },
    enabled: isOpen,
    refetchInterval: isOpen ? 30_000 : false,
    staleTime: 20_000,
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
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed top-14 left-1/2 -translate-x-1/2 md:absolute md:top-12 md:left-auto md:right-0 md:translate-x-0 z-50 w-[95vw] md:w-80 glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: "420px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bell size={14} />
              Notifications
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-white/15 text-white px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-[11px] text-white/40 hover:text-white flex items-center gap-1 transition"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: "360px" }}>
            {isLoading && (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4 space-y-2">
                <Bell size={32} className="text-white/20" />
                <p className="text-sm text-white/40">You're all caught up!</p>
              </div>
            )}

            {!isLoading && notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`group flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition cursor-pointer ${
                  !n.isRead ? "bg-white/[0.04]" : ""
                }`}
                onClick={() => handleNotifClick(n)}
              >
                {/* Icon */}
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <NotifIcon type={n.type} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-relaxed ${n.isRead ? "text-white/50" : "text-white/80 font-medium"}`}>
                    {notifSummary(n)}
                  </p>
                  <p className="text-[10px] text-white/25 mt-0.5">
                    {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                      className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition"
                      title="Mark as read"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(n.id); }}
                    className="p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Unread dot */}
                {!n.isRead && (
                  <div className="h-2 w-2 rounded-full bg-white shrink-0 mt-1.5" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
