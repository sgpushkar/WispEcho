"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Users, Check, ShieldCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/useChatStore";
import { Avatar } from "../ui/Avatar";
import { Portal } from "../ui/Portal";

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
}

export function CreateGroupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const { data: friendsData } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => (await api.get("/friends")).data,
    enabled: isOpen,
  });

  const createGroup = useMutation({
    mutationFn: async () => api.post("/groups", { name, description, memberIds: selectedFriends }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConversation(res.data.conversation.id);
      setName("");
      setDescription("");
      setSelectedFriends([]);
      onClose();
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error creating group"),
  });

  if (!isOpen) return null;

  const friends = friendsData?.friends || [];

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass relative flex h-[500px] max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--glass-border-strong)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--ink)]">
            <Users size={18} /> Create Group
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-[var(--ink-faint)] hover:bg-[var(--hover-bg)] hover:text-[var(--ink)] transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink-dim)]">Group Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Squad"
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--hover-bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-accent/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink-dim)]">Select Friends</label>
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--hover-bg)] p-2">
              {friends.length === 0 ? (
                <p className="p-2 text-center text-sm text-[var(--ink-faint)]">You need friends to create a group.</p>
              ) : (
                friends.map((friend: User) => (
                  <button
                    key={friend.id}
                    onClick={() => toggleFriend(friend.id)}
                    className="flex w-full items-center justify-between rounded-lg p-2 hover:bg-[var(--active-bg)] transition text-[var(--ink)]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={friend.avatarUrl} name={friend.displayName} className="h-8 w-8 rounded-full text-[10px] border-none" />
                      <span className="text-sm font-medium">{friend.displayName}</span>
                    </div>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${selectedFriends.includes(friend.id) ? 'border-accent bg-accent text-white' : 'border-[var(--glass-border-strong)]'}`}>
                      {selectedFriends.includes(friend.id) && <Check size={12} />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--glass-border)] p-4">
          <button
            onClick={() => createGroup.mutate()}
            disabled={!name || selectedFriends.length === 0 || createGroup.isPending}
            className="w-full rounded-xl bg-accent px-4 py-2 font-medium text-white hover:bg-accent/90 transition disabled:opacity-50"
          >
            {createGroup.isPending ? "Creating..." : "Create Group"}
          </button>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-white/25">
            <ShieldCheck size={11} />
            <span>encrypted &amp; secure group chat</span>
          </div>
        </div>
      </motion.div>
      </div>
    </Portal>
  );
}
