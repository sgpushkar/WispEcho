"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, Check, X as XIcon, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/useChatStore";
import Link from "next/link";
import { Avatar } from "../ui/Avatar";

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
}

interface Friendship {
  id: string;
  requester?: User;
  addressee?: User;
}

export function FriendsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"friends" | "add" | "requests">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const { data: friendsData } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => (await api.get("/friends")).data,
    enabled: isOpen && tab === "friends",
  });

  const { data: requestsData } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: async () => (await api.get("/friends/requests")).data,
    enabled: isOpen && tab === "requests",
  });

  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ["users-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return { users: [] };
      return (await api.get(`/users/search?q=${searchQuery}`)).data;
    },
    enabled: isOpen && tab === "add" && searchQuery.length > 0,
  });

  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => api.post("/friends/requests", { addresseeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      alert("Friend request sent!");
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error sending request"),
  });

  const respondRequest = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "reject" }) =>
      api.patch(`/friends/requests/${id}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const startDirectMessage = async (userId: string) => {
    try {
      const { data } = await api.get(`/messages/conversations/direct/${userId}`);
      if (data.conversation) {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        setActiveConversation(data.conversation.id);
        onClose();
      }
    } catch (err) {
      console.error("Error starting conversation", err);
    }
  };

  if (!isOpen) return null;

  const friends = friendsData?.friends || [];
  const incomingRequests = requestsData?.incoming || [];
  const searchResults = searchData?.users || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass relative flex h-[600px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="text-lg font-semibold">Friends</h2>
          <button onClick={onClose} className="rounded-full p-1 text-white/40 hover:bg-white/5 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 pb-0">
          {(["friends", "add", "requests"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === t ? "text-white" : "text-white/40 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              {t === "requests" && incomingRequests.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-[10px] text-white">
                  {incomingRequests.length}
                </span>
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {tab === t && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 h-0.5 w-full bg-accent"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "friends" && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <p className="text-center text-sm text-white/40 mt-10">No friends yet. Add some!</p>
              ) : (
                friends.map((friend: User) => (
                  <div key={friend.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                    <Link href={`/profile?u=${friend.username}`} onClick={onClose} className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
                      <Avatar src={friend.avatarUrl} name={friend.displayName} className="h-10 w-10 rounded-full text-xs border-none" />
                      <div>
                        <p className="font-medium text-sm">{friend.displayName}</p>
                        <p className="text-xs text-white/40">@{friend.username}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => startDirectMessage(friend.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "add" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <Search size={16} className="text-white/40" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="search username..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                {isSearching ? (
                  <p className="text-center text-sm text-white/40 mt-10">Searching...</p>
                ) : searchResults.length === 0 && searchQuery ? (
                  <p className="text-center text-sm text-white/40 mt-10">No users found.</p>
                ) : (
                  searchResults.map((user: User) => (
                    <div key={user.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                      <Link href={`/profile?u=${user.username}`} onClick={onClose} className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
                        <Avatar src={user.avatarUrl} name={user.displayName} className="h-10 w-10 rounded-full text-xs border-none" />
                        <div>
                          <p className="font-medium text-sm">{user.displayName}</p>
                          <p className="text-xs text-white/40">@{user.username}</p>
                        </div>
                      </Link>
                      <button
                        onClick={() => sendRequest.mutate(user.id)}
                        disabled={sendRequest.isPending}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50"
                      >
                        <UserPlus size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "requests" && (
            <div className="space-y-2">
              {incomingRequests.length === 0 ? (
                <p className="text-center text-sm text-white/40 mt-10">No pending requests.</p>
              ) : (
                incomingRequests.map((req: Friendship) => {
                  const user = req.requester;
                  if (!user) return null;
                  return (
                    <div key={req.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                      <Link href={`/profile?u=${user.username}`} onClick={onClose} className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
                        <Avatar src={user.avatarUrl} name={user.displayName} className="h-10 w-10 rounded-full text-xs border-none" />
                        <div>
                          <p className="font-medium text-sm">{user.displayName}</p>
                          <p className="text-xs text-white/40">@{user.username}</p>
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondRequest.mutate({ id: req.id, action: "accept" })}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => respondRequest.mutate({ id: req.id, action: "reject" })}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                        >
                          <XIcon size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
