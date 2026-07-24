"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, User as UserIcon, Palette, Bell } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "../ui/Avatar";

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [activeTab, setActiveTab] = useState<"profile" | "customization" | "preferences">("profile");

  // Profile fields
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Customization fields
  const [pronouns, setPronouns] = useState("");
  const [status, setStatus] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  // Preferences fields (Local)
  const [muteSounds, setMuteSounds] = useState(false);
  const [ambientGlow, setAmbientGlow] = useState(true);

  useEffect(() => {
    if (user && isOpen) {
      setUsername(user.username || "");
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl || "");
      setPronouns(user.pronouns || "");
      setStatus(user.status || "");
      setAccentColor(user.accentColor || "#8b5cf6");
      setBannerUrl(user.bannerUrl || "");

      // Load local settings
      setMuteSounds(localStorage.getItem("mute_sounds") === "true");
      setAmbientGlow(localStorage.getItem("ambient_glow") !== "false");
    }
  }, [user, isOpen]);

  const updateProfile = useMutation({
    mutationFn: async () =>
      api.patch("/users/me", {
        username,
        displayName,
        bio,
        pronouns,
        avatarUrl,
        bannerUrl,
        accentColor,
        status,
      }),
    onSuccess: (res) => {
      if (res.data.user) {
        setUser(res.data.user);
      }
      localStorage.setItem("mute_sounds", muteSounds ? "true" : "false");
      localStorage.setItem("ambient_glow", ambientGlow ? "true" : "false");
      // Apply ambient glow class to body immediately if toggled
      if (ambientGlow) {
        document.body.classList.add("ambient-glow-enabled");
      } else {
        document.body.classList.remove("ambient-glow-enabled");
      }
      onClose();
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error updating profile"),
  });

  if (!isOpen) return null;

  const ACCENT_COLORS = [
    "#8b5cf6", // Purple
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#ef4444", // Red
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass relative flex h-[580px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings size={18} className="text-white/80" /> App Settings
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 bg-white/[0.01]">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === "profile" ? "border-b-2 border-white text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("customization")}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === "customization" ? "border-b-2 border-white text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === "preferences" ? "border-b-2 border-white text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            Preferences
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <Avatar src={avatarUrl} name={displayName || username} className="h-24 w-24 rounded-full border-2 border-white/10 text-2xl" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20 text-white focus:border-white/10 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="your name"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20 text-white focus:border-white/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Avatar URL</label>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20 text-white focus:border-white/10 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="vibing..."
                  rows={3}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20 text-white resize-none focus:border-white/10 transition"
                />
              </div>
            </div>
          )}

          {activeTab === "customization" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Pronouns</label>
                  <input
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    placeholder="e.g. they/them"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20 text-white focus:border-white/10 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Custom Status</label>
                  <input
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="current mood..."
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20 text-white focus:border-white/10 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Banner URL</label>
                <input
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20 text-white focus:border-white/10 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Accent Color</label>
                <div className="flex gap-3 pt-1">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform border border-white/10 ${
                        accentColor === c ? "scale-125 border-white shadow-lg" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Bell size={16} className="text-white/50" /> Sound Notifications
                  </span>
                  <span className="text-xs text-white/40">Play a subtle ring on receiving messages</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMuteSounds(!muteSounds)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    !muteSounds ? "bg-white/30" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      !muteSounds ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Palette size={16} className="text-white/50" /> Ambient Glow
                  </span>
                  <span className="text-xs text-white/40">Enable translucent glass effects</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAmbientGlow(!ambientGlow)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    ambientGlow ? "bg-white/30" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      ambientGlow ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 p-4 flex gap-3 bg-white/[0.01]">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={() => updateProfile.mutate()}
            disabled={!username || !displayName || updateProfile.isPending}
            className="flex-1 rounded-2xl bg-white text-[#0a0a0a] px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition disabled:opacity-50"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
