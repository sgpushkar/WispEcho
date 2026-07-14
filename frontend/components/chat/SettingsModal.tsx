"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Settings, User as UserIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (user && isOpen) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user, isOpen]);

  const updateProfile = useMutation({
    mutationFn: async () => api.patch("/users/me", { displayName, bio, avatarUrl }),
    onSuccess: (res) => {
      if (res.data.user) {
        setUser(res.data.user);
      }
      onClose();
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error updating profile"),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass relative flex h-[500px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings size={18} /> Settings
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-white/40 hover:bg-white/5 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-center mb-6 mt-2">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full bg-white/10 border-2 border-white/10 flex items-center justify-center text-2xl font-bold text-white/80">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon size={32} />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 text-white resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60">Avatar URL</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 text-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2 font-medium text-white/80 hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => updateProfile.mutate()}
            disabled={!displayName || updateProfile.isPending}
            className="flex-1 rounded-xl bg-white/10 border border-white/10 px-4 py-2 font-medium text-white hover:bg-white/16 transition disabled:opacity-50"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
