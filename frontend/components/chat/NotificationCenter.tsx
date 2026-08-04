"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Circle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDistanceToNowStrict } from "date-fns";
import { Avatar } from "@/components/ui/Avatar";
import { useUIStore } from "@/store/useUIStore";

interface InboxNotification {
  id: string;
  type: string;
  payload: any;
  isRead: boolean;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface Friendship {
  id: string;
  requester?: User;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "follows">("all");
  const { setFriendsOpen } = useUIStore();

  const { data: notifData, isLoading: loadingNotifs } = useQuery({
    queryKey: ["inbox-notifications"],
    queryFn: async () => (await api.get("/inbox")).data as { notifications: InboxNotification[]; unreadCount: number },
    enabled: isOpen,
    refetchInterval: isOpen ? 30_000 : false,
  });

  const { data: requestsData } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: async () => (await api.get("/friends/requests")).data as { incoming: Friendship[] },
    enabled: isOpen,
  });

  const respondRequest = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "reject" }) =>
      api.patch(`/friends/requests/${id}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-notifications"] });
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/inbox/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-notifications"] }),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  const notifications = notifData?.notifications || [];
  const incomingRequests = requestsData?.incoming || [];

  // Group requests if in "All" tab
  const showRequestsGroup = activeTab === "all" && incomingRequests.length > 0;

  // Filter out friend requests from standard notifications list since we handle them in the requests group or follows tab
  const filteredNotifs = notifications.filter((n) => n.type !== "FRIEND_REQUEST");

  // Time grouping logic for standard notifications
  const now = new Date();
  const newNotifs = filteredNotifs.filter((n) => (now.getTime() - new Date(n.createdAt).getTime()) < 48 * 60 * 60 * 1000); // last 48 hours
  const olderNotifs = filteredNotifs.filter((n) => (now.getTime() - new Date(n.createdAt).getTime()) >= 48 * 60 * 60 * 1000);

  // Tab styling
  const tabClass = (id: string) =>
    `px-4 py-1.5 rounded-full text-[13px] font-semibold border transition ${
      activeTab === id
        ? "bg-white text-black border-white"
        : "bg-transparent text-white border-white/20 hover:border-white/40 hover:bg-white/5"
    }`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed top-14 left-1/2 -translate-x-1/2 md:absolute md:top-12 md:left-auto md:right-0 md:translate-x-0 z-50 w-[95vw] md:w-[380px] bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "80vh", minHeight: "400px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Notifications</h2>
            <button onClick={onClose} className="p-1.5 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <button className={tabClass("all")} onClick={() => setActiveTab("all")}>
              All
            </button>
            <button className={tabClass("follows")} onClick={() => setActiveTab("follows")}>
              Follow requests
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
            {activeTab === "follows" ? (
              <div className="px-4 mt-2">
                {incomingRequests.length === 0 ? (
                  <p className="text-sm text-white/40 mt-4 text-center">No pending requests.</p>
                ) : (
                  <div className="space-y-4">
                    {incomingRequests.map((req) => (
                      <div key={req.id} className="flex items-center gap-3">
                        <Avatar src={req.requester?.avatarUrl} name={req.requester?.displayName} className="h-11 w-11 rounded-full shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] leading-snug">
                            <span className="font-semibold text-white">{req.requester?.username}</span>{" "}
                            <span className="text-white/70">requested to follow you.</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => respondRequest.mutate({ id: req.id, action: "accept" })}
                            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => respondRequest.mutate({ id: req.id, action: "reject" })}
                            className="bg-white/10 hover:bg-white/15 text-white px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Aggregated Follow Requests block */}
                {showRequestsGroup && (
                  <div
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer transition border-b border-white/5"
                    onClick={() => setActiveTab("follows")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0">
                        {incomingRequests[0]?.requester && (
                          <Avatar
                            src={incomingRequests[0].requester.avatarUrl}
                            name={incomingRequests[0].requester.displayName}
                            className="h-11 w-11 rounded-full border-2 border-[#111111]"
                          />
                        )}
                        {incomingRequests.length > 1 && incomingRequests[1]?.requester && (
                          <Avatar
                            src={incomingRequests[1].requester.avatarUrl}
                            name={incomingRequests[1].requester.displayName}
                            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-[#111111]"
                          />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-white">Follow requests</span>
                        <span className="text-[13px] text-white/50">
                          {incomingRequests[0]?.requester?.username} {incomingRequests.length > 1 ? `+ ${incomingRequests.length - 1} others` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle size={8} className="fill-blue-500 text-blue-500" />
                      <ChevronRight size={20} className="text-white/40" />
                    </div>
                  </div>
                )}

                {newNotifs.length > 0 && (
                  <div className="mt-4 px-4">
                    <h4 className="text-[15px] font-bold text-white mb-3">New</h4>
                    <div className="space-y-4">
                      {newNotifs.map((n) => (
                        <NotifItem key={n.id} n={n} onClick={() => { if (!n.isRead) markRead.mutate(n.id); }} />
                      ))}
                    </div>
                  </div>
                )}

                {olderNotifs.length > 0 && (
                  <div className="mt-6 px-4">
                    <h4 className="text-[15px] font-bold text-white mb-3">Earlier</h4>
                    <div className="space-y-4">
                      {olderNotifs.map((n) => (
                        <NotifItem key={n.id} n={n} onClick={() => { if (!n.isRead) markRead.mutate(n.id); }} />
                      ))}
                    </div>
                  </div>
                )}

                {newNotifs.length === 0 && olderNotifs.length === 0 && !showRequestsGroup && !loadingNotifs && (
                  <p className="text-sm text-white/40 mt-10 text-center">No notifications yet.</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NotifItem({ n, onClick }: { n: InboxNotification; onClick: () => void }) {
  const p = n.payload || {};
  
  // Format based on type
  let text = p.message || "New notification";
  if (n.type === "MENTION") text = `mentioned you: ${p.message || ""}`;
  if (n.type === "REACTION") text = `reacted to your message.`;
  if (n.type === "GROUP_INVITE") text = `invited you to a group.`;

  return (
    <div className="flex items-center gap-3 cursor-pointer group" onClick={onClick}>
      <Avatar name={p.from || "System"} className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug">
          <span className="font-semibold text-white">{p.from || "Someone"}</span>{" "}
          <span className={`text-white/70 ${!n.isRead ? "text-white font-medium" : ""}`}>{text}</span>{" "}
          <span className="text-white/40">{formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}</span>
        </p>
      </div>
      {!n.isRead && (
        <div className="shrink-0 flex items-center justify-center">
          <Circle size={8} className="fill-blue-500 text-blue-500" />
        </div>
      )}
    </div>
  );
}
