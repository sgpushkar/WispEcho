"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, User as UserIcon, Palette, Bell, Lock, Eye, EyeOff, Camera } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "../ui/Avatar";
import { useUIStore } from "@/store/useUIStore";
import { VersionSettings } from "../ui/VersionSettings";
import { SessionManager } from "./SessionManager";

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { theme: storeTheme } = useUIStore();
  const isDark = storeTheme === "dark";

  const [activeTab, setActiveTab] = useState<"profile" | "customization" | "preferences" | "devices">("profile");

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

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "avatar") setIsUploadingAvatar(true);
    else setIsUploadingBanner(true);

    try {
      const sigRes = await api.get("/upload/signature");
      const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (type === "avatar") setAvatarUrl(data.secure_url);
      else setBannerUrl(data.secure_url);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload image");
    } finally {
      if (type === "avatar") setIsUploadingAvatar(false);
      else setIsUploadingBanner(false);
    }
  };

  // Preferences fields (Local)
  const [muteSounds, setMuteSounds] = useState(false);
  const [ambientGlow, setAmbientGlow] = useState(true);

  // Password change state
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const { setTheme: setStoreTheme } = useUIStore();
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

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
      setThemeMode(storeTheme);
      // Fetch hasPassword from /auth/me
      api.get("/auth/me").then((res) => setHasPassword(res.data.hasPassword)).catch(() => {});
    }
  }, [user, isOpen, storeTheme]);

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
      setStoreTheme(themeMode);
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

  const changePassword = useMutation({
    mutationFn: async () => {
      const endpoint = hasPassword ? "/auth/change-password" : "/auth/set-password";
      const body = hasPassword
        ? { currentPassword, newPassword }
        : { password: newPassword };
      return api.post(endpoint, body);
    },
    onSuccess: () => {
      setPwSuccess(true);
      setPwError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasPassword(true);
      setTimeout(() => setPwSuccess(false), 3000);
    },
    onError: (err: any) => setPwError(err.response?.data?.error || "Failed to update password"),
  });

  function handlePasswordSubmit() {
    setPwError(null);
    if (newPassword.length < 8) { setPwError("Minimum 8 characters"); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords don't match"); return; }
    changePassword.mutate();
  }

  if (!isOpen) return null;

  const ACCENT_COLORS = [
    "#8b5cf6", // Purple
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#ef4444", // Red
  ];

  // Theme-aware style tokens
  const modalBg = isDark ? "rgba(18,18,22,0.97)" : "rgba(255,255,255,0.97)";
  const headerBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const inkColor = isDark ? "#ffffff" : "#000000";
  const inkDim = isDark ? "rgba(255,255,255,0.7)" : "#333333";
  const inkFaint = isDark ? "rgba(255,255,255,0.4)" : "#777777";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const inputBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)";
  const inputFocusBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)";
  const sectionBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
  const sectionBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const footerBg = isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.02)";
  const cancelBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const cancelHoverBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const saveBg = isDark ? "#ffffff" : "#111111";
  const saveText = isDark ? "#0a0a0a" : "#ffffff";
  const overlayBg = isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)";
  const tabActiveBorder = isDark ? "#ffffff" : "#000000";
  const tabActiveText = isDark ? "#ffffff" : "#000000";
  const closeHoverBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const toggleActiveBg = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";
  const toggleInactiveBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const pwSectionBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)";
  const pwSectionBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "16px",
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    padding: "12px 16px",
    fontSize: "14px",
    outline: "none",
    color: inkColor,
    transition: "border-color 0.18s",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: overlayBg, backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative flex h-[580px] w-full max-w-md flex-col overflow-hidden rounded-3xl"
        style={{
          background: modalBg,
          border: `1px solid ${headerBorder}`,
          backdropFilter: "blur(32px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${headerBorder}` }}
        >
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: inkColor }}>
            <Settings size={18} style={{ color: inkDim }} /> App Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition"
            style={{ color: inkFaint }}
            onMouseEnter={(e) => (e.currentTarget.style.background = closeHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex"
          style={{ borderBottom: `1px solid ${headerBorder}`, background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.02)" }}
        >
          {(["profile", "customization", "preferences", "devices"] as const).map((tab) => {
            const labels: Record<string, string> = {
              profile: "Profile",
              customization: "Appearance",
              preferences: "Preferences",
              devices: "Devices",
            };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition"
                style={{
                  color: isActive ? tabActiveText : inkFaint,
                  borderBottom: isActive ? `2px solid ${tabActiveBorder}` : "2px solid transparent",
                  background: "transparent",
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="relative group cursor-pointer rounded-full">
                  <Avatar src={avatarUrl} name={displayName || username} className="h-24 w-24 rounded-full text-2xl border-2" />
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    {isUploadingAvatar ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Camera size={24} className="text-white" />}
                  </div>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer rounded-full w-full h-full" onChange={(e) => handleImageUpload(e, "avatar")} disabled={isUploadingAvatar} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: inkFaint }}>Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    style={{ ...inputStyle }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: inkFaint }}>Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="your name"
                    style={{ ...inputStyle }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: inkFaint }}>Avatar URL</label>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ ...inputStyle }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: inkFaint }}>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="vibing..."
                  rows={3}
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
                />
              </div>

              {/* Password section */}
              <div className="rounded-2xl p-4 space-y-3" style={{ border: `1px solid ${pwSectionBorder}`, background: pwSectionBg }}>
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={14} style={{ color: inkFaint }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: inkFaint }}>
                    {hasPassword ? "Change Password" : "Set Password"}
                  </span>
                </div>

                {hasPassword && (
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      style={{ ...inputStyle, paddingRight: "40px" }}
                    />
                  </div>
                )}

                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    style={{ ...inputStyle, paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                    style={{ color: inkFaint }}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={{ ...inputStyle }}
                />

                {pwError && <p className="text-xs text-red-500">{pwError}</p>}
                {pwSuccess && <p className="text-xs text-green-500">Password updated successfully!</p>}

                <button
                  type="button"
                  onClick={handlePasswordSubmit}
                  disabled={changePassword.isPending}
                  className="w-full rounded-2xl py-2.5 text-sm font-semibold transition disabled:opacity-50"
                  style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inkColor }}
                >
                  {changePassword.isPending ? "Saving..." : hasPassword ? "Update Password" : "Set Password"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "customization" && (
            <div className="space-y-4">
              <div className="relative h-24 rounded-2xl overflow-hidden group cursor-pointer mb-2" style={{ background: inputBg, border: `1px solid ${inputBorder}` }}>
                {bannerUrl ? <img src={bannerUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ color: inkFaint }}>No Banner</div>}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  {isUploadingBanner ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Camera size={24} className="text-white" />}
                </div>
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, "banner")} disabled={isUploadingBanner} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: inkFaint }}>Pronouns</label>
                  <input
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    placeholder="e.g. they/them"
                    style={{ ...inputStyle }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: inkFaint }}>Custom Status</label>
                  <input
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="current mood..."
                    style={{ ...inputStyle }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: inkFaint }}>Banner URL</label>
                <input
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ ...inputStyle }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: inkFaint }}>Accent Color</label>
                <div className="flex gap-3 pt-1">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform border ${
                        accentColor === c ? "scale-125 shadow-lg" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c, borderColor: accentColor === c ? inkColor : inputBorder }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between rounded-2xl p-4" style={{ border: `1px solid ${sectionBorder}`, background: sectionBg }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold flex items-center gap-2" style={{ color: inkDim }}>
                    <Palette size={16} style={{ color: inkFaint }} /> Theme Mode
                  </span>
                  <span className="text-xs" style={{ color: inkFaint }}>Select application visual style</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeMode("light")}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl transition"
                    style={{
                      background: themeMode === "light" ? inkColor : inputBg,
                      color: themeMode === "light" ? (isDark ? "#000" : "#fff") : inkDim,
                      border: `1px solid ${themeMode === "light" ? inkColor : inputBorder}`,
                    }}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode("dark")}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl transition"
                    style={{
                      background: themeMode === "dark" ? inkColor : inputBg,
                      color: themeMode === "dark" ? (isDark ? "#000" : "#fff") : inkDim,
                      border: `1px solid ${themeMode === "dark" ? inkColor : inputBorder}`,
                    }}
                  >
                    Dark
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl p-4" style={{ border: `1px solid ${sectionBorder}`, background: sectionBg }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold flex items-center gap-2" style={{ color: inkDim }}>
                    <Bell size={16} style={{ color: inkFaint }} /> Sound Notifications
                  </span>
                  <span className="text-xs" style={{ color: inkFaint }}>Play a subtle ring on receiving messages</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMuteSounds(!muteSounds)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{ background: !muteSounds ? toggleActiveBg : toggleInactiveBg }}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    style={{ transform: !muteSounds ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl p-4" style={{ border: `1px solid ${sectionBorder}`, background: sectionBg }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold flex items-center gap-2" style={{ color: inkDim }}>
                    <Palette size={16} style={{ color: inkFaint }} /> Ambient Glow
                  </span>
                  <span className="text-xs" style={{ color: inkFaint }}>Enable translucent glass effects</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAmbientGlow(!ambientGlow)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{ background: ambientGlow ? toggleActiveBg : toggleInactiveBg }}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    style={{ transform: ambientGlow ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              {/* Version & Update Checks */}
              <div className="pt-4" style={{ borderTop: `1px solid ${sectionBorder}` }}>
                <VersionSettings />
              </div>
            </div>
          )}

          {activeTab === "devices" && (
            <SessionManager />
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 flex flex-col gap-3"
          style={{ borderTop: `1px solid ${headerBorder}`, background: footerBg }}
        >
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-wider transition"
              style={{ background: cancelBg, border: `1px solid ${inputBorder}`, color: inkDim }}
              onMouseEnter={(e) => (e.currentTarget.style.background = cancelHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = cancelBg)}
            >
              Cancel
            </button>
            <button
              onClick={() => updateProfile.mutate()}
              disabled={!username || !displayName || updateProfile.isPending}
              className="flex-1 rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50"
              style={{ background: saveBg, color: saveText }}
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
          <p className="text-center text-[10px] font-semibold tracking-wider uppercase" style={{ color: inkFaint }}>
            WispEcho App v1.2.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
