"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, User as UserIcon, Palette, Bell, Lock, Eye, EyeOff, Camera, Crown, Check } from "lucide-react";
import { Portal } from "../ui/Portal";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "../ui/Avatar";
import { useUIStore } from "@/store/useUIStore";
import { VersionSettings } from "../ui/VersionSettings";
import { SessionManager } from "./SessionManager";
import { themes, THEME_ORDER, type ThemeDefinition } from "@/lib/themes";
import { ThemeEditor } from "./ThemeEditor";

// ─── Mini Chat Preview for Theme Cards ────────────────────────────────────────
function ThemePreview({ theme }: { theme: ThemeDefinition }) {
  return (
    <div
      className="rounded-xl overflow-hidden h-[72px] w-full flex flex-col justify-end p-2 gap-1"
      style={{ background: theme.colors.bg, border: `1px solid ${theme.colors.glassBorder}` }}
    >
      {/* Received bubble */}
      <div className="flex">
        <div
          className="rounded-xl rounded-bl-sm px-2.5 py-1 text-[9px] max-w-[65%]"
          style={{
            background: theme.colors.bubbleTheirs,
            border: `1px solid ${theme.colors.bubbleTheirsBorder}`,
            color: theme.colors.ink,
          }}
        >
          Hey 👋
        </div>
      </div>
      {/* Sent bubble */}
      <div className="flex justify-end">
        <div
          className="rounded-xl rounded-br-sm px-2.5 py-1 text-[9px] max-w-[65%]"
          style={{
            background: theme.colors.bubbleMine,
            border: `1px solid ${theme.colors.bubbleMineBorder}`,
            color: theme.colors.ink,
          }}
        >
          What&apos;s up? 🔥
        </div>
      </div>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { themeId: currentThemeId, applyTheme, getActiveTheme } = useUIStore();

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
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [showPaymentCheck, setShowPaymentCheck] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleUnlockPremium = () => {
    // redirect to UPI intent
    const upiUrl = "upi://pay?pa=pushkarmhatre424@okaxis&pn=Pushkar%20Mhatre&am=39.00&cu=INR&tn=GenzChat%20Pro";
    window.location.href = upiUrl;
    
    // Check payment status after short delay
    setTimeout(() => {
      setShowPaymentCheck(true);
    }, 4000);
  };

  const handleClaimPayment = async () => {
    setIsClaiming(true);
    try {
      await api.post("/subscription/claim-payment", { amount: 39 });
      showToast("Payment claim submitted! Admin will verify and grant Pro access soon.", "success");
      setShowPaymentCheck(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to submit claim", "error");
    } finally {
      setIsClaiming(false);
    }
  };

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

  // Notifications (Server)
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(false);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState("22:00");
  const [dndEnd, setDndEnd] = useState("08:00");

  // Password change state
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

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
      // Fetch hasPassword and emailDigest from /auth/me
      api.get("/auth/me").then((res) => {
        setHasPassword(res.data.hasPassword);
        setEmailDigestEnabled(!!res.data.user.emailDigest);
      }).catch(() => {});
      
      api.get("/notifications/dnd").then((res) => {
        if (res.data.dnd) {
          setDndEnabled(res.data.dnd.enabled);
          const startH = res.data.dnd.startHour ?? (res.data.dnd.startTime ? parseInt(res.data.dnd.startTime) : 22);
          const endH = res.data.dnd.endHour ?? (res.data.dnd.endTime ? parseInt(res.data.dnd.endTime) : 8);
          setDndStart(`${String(startH).padStart(2, "0")}:00`);
          setDndEnd(`${String(endH).padStart(2, "0")}:00`);
        }
      }).catch(() => {});
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
        themeId: currentThemeId,
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
      
      // Update Server Preferences
      const startHour = parseInt(dndStart.split(":")[0], 10) || 0;
      const endHour = parseInt(dndEnd.split(":")[0], 10) || 0;
      api.patch("/notifications/email-digest", { enabled: emailDigestEnabled }).catch(() => {});
      api.put("/notifications/dnd", { 
        enabled: dndEnabled, 
        startHour, 
        endHour, 
        startTime: dndStart, 
        endTime: dndEnd,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      }).catch(() => {});
      
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

  // CSS-var-aware style tokens (read from theme, not isDark ternaries)
  const activeTheme = getActiveTheme();
  const isDarkMode = activeTheme.mode === "dark";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "16px",
    border: `1px solid var(--glass-border)`,
    background: "var(--glass-bg)",
    padding: "12px 16px",
    fontSize: "14px",
    outline: "none",
    color: "var(--ink)",
    transition: "border-color 0.18s",
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
        style={{ background: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}
      >
        <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative flex h-[580px] max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl"
        style={{
          background: isDarkMode ? "rgba(18,18,22,0.97)" : "rgba(255,255,255,0.97)",
          border: `1px solid var(--glass-border)`,
          backdropFilter: "blur(32px)",
        }}
      >
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-full text-xs font-semibold shadow-xl"
               style={{ 
                 background: toast.type === "success" ? "var(--accent-success, #10b981)" : "var(--accent-danger, #ef4444)", 
                 color: "#fff",
                 animation: "fade-in 0.2s ease-out" 
               }}>
            {toast.msg}
          </div>
        )}
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid var(--glass-border)` }}
        >
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <Settings size={18} style={{ color: "var(--ink-dim)" }} /> App Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition hover:bg-[var(--hover-bg)]"
            style={{ color: "var(--ink-faint)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex"
          style={{ borderBottom: `1px solid var(--glass-border)`, background: "var(--glass-bg)" }}
        >
          {(["profile", "customization", "preferences", "devices"] as const).map((tab) => {
            const labels: Record<string, string> = {
              profile: "Profile",
              customization: "Themes",
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
                  color: isActive ? "var(--ink)" : "var(--ink-faint)",
                  borderBottom: isActive ? `2px solid var(--ink)` : "2px solid transparent",
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
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    style={{ ...inputStyle }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="your name"
                    style={{ ...inputStyle }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Avatar URL</label>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ ...inputStyle }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="vibing..."
                  rows={3}
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
                />
              </div>

              {/* Password section */}
              <div className="rounded-2xl p-4 space-y-3" style={{ border: `1px solid var(--glass-border)`, background: "var(--glass-bg)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={14} style={{ color: "var(--ink-faint)" }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>
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
                    style={{ color: "var(--ink-faint)" }}
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
                  style={{ background: "var(--glass-bg)", border: `1px solid var(--glass-border)`, color: "var(--ink)" }}
                >
                  {changePassword.isPending ? "Saving..." : hasPassword ? "Update Password" : "Set Password"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "customization" && (
            <div className="space-y-5">
              {/* ── Theme Store Grid ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>
                    Choose Theme
                  </label>
                  <button
                    onClick={() => setShowThemeEditor(true)}
                    className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-xl transition"
                    style={{ background: "var(--glass-bg)", border: `1px solid var(--glass-border)`, color: "var(--ink-dim)" }}
                  >
                    🎨 Custom
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {THEME_ORDER.map((id) => {
                    const theme = themes[id];
                    if (!theme) return null;
                    const isSelected = currentThemeId === id;
                    const isLocked = theme.premium && !(user?.role === "SUPER_ADMIN" || user?.isPro);

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            showToast("This is a Pro theme! You need a Pro subscription or Super Admin privileges.", "error");
                            return;
                          }
                          // Add smooth transition class
                          document.documentElement.classList.add("theme-transitioning");
                          applyTheme(id);
                          setTimeout(() => {
                            document.documentElement.classList.remove("theme-transitioning");
                          }, 500);
                        }}
                        className={`relative rounded-2xl p-2.5 text-left transition-all group ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{
                          background: isSelected ? "var(--active-bg)" : "var(--glass-bg)",
                          border: `1.5px solid ${isSelected ? "var(--ink)" : "var(--glass-border)"}`,
                        }}
                      >
                        {/* Selected indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: "var(--ink)", color: "var(--bg)" }}>
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}

                        {/* Premium badge or Lock */}
                        {theme.premium && (
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider"
                            style={{ background: isLocked ? "var(--glass-bg)" : "linear-gradient(135deg, #f59e0b, #d97706)", color: isLocked ? "var(--ink-faint)" : "#000", border: isLocked ? "1px solid var(--glass-border)" : "none" }}>
                            {isLocked ? <Lock size={8} /> : <Crown size={8} />} {isLocked ? 'LOCKED' : 'PRO'}
                          </div>
                        )}

                        {/* Theme preview */}
                        <ThemePreview theme={theme} />

                        {/* Theme name */}
                        <div className="flex items-center gap-1.5 mt-2 px-0.5">
                          <span className="text-sm">{theme.emoji}</span>
                          <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                            {theme.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subscription indicator */}
              {!user?.isPro && user?.role !== "SUPER_ADMIN" && (
                <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown size={14} style={{ color: "#f59e0b" }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#f59e0b" }}>Unlock Pro Themes</span>
                  </div>
                  <p className="text-[11px] leading-relaxed mb-3" style={{ color: "var(--ink-faint)" }}>
                    Get access to 7 premium themes, unlimited custom themes, and chat background images.
                  </p>
                  
                  {!showPaymentCheck ? (
                    <button 
                      onClick={handleUnlockPremium}
                      className="w-full rounded-xl py-2 text-xs font-bold uppercase tracking-wider transition hover:opacity-90"
                      style={{ background: "#f59e0b", color: "#000" }}
                    >
                      Unlock Premium (₹39/mo)
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-3 mt-2">
                      <div className="p-2 bg-white rounded-xl">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent("upi://pay?pa=pushkarmhatre424@okaxis&pn=Pushkar%20Mhatre&am=39.00&cu=INR&tn=GenzChat%20Pro")}`}
                          alt="UPI QR Code"
                          className="w-[120px] h-[120px]"
                        />
                      </div>
                      <p className="text-center text-[10px] uppercase font-bold" style={{ color: "#f59e0b" }}>Scan to Pay or tap on mobile</p>
                      <div className="flex gap-2 w-full mt-1">
                        <button 
                          onClick={handleClaimPayment}
                          disabled={isClaiming}
                          className="flex-1 rounded-xl py-2 text-xs font-bold transition disabled:opacity-50"
                          style={{ background: "var(--ink)", color: "var(--bg)" }}
                        >
                          {isClaiming ? "Submitting..." : "Paid"}
                        </button>
                        <button 
                          onClick={() => setShowPaymentCheck(false)}
                          disabled={isClaiming}
                          className="flex-1 rounded-xl py-2 text-xs font-bold transition disabled:opacity-50"
                          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--ink)" }}
                        >
                          Not Paid
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: "var(--glass-border)" }} />

              {/* Profile customization */}
              <div className="relative h-24 rounded-2xl overflow-hidden group cursor-pointer mb-2" style={{ background: "var(--glass-bg)", border: `1px solid var(--glass-border)` }}>
                {bannerUrl ? <img src={bannerUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--ink-faint)" }}>No Banner</div>}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  {isUploadingBanner ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Camera size={24} className="text-white" />}
                </div>
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, "banner")} disabled={isUploadingBanner} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Pronouns</label>
                  <input
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    placeholder="e.g. they/them"
                    style={{ ...inputStyle }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Custom Status</label>
                  <input
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="current mood..."
                    style={{ ...inputStyle }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Banner URL</label>
                <input
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ ...inputStyle }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Accent Color</label>
                <div className="flex gap-3 pt-1">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform border ${
                        accentColor === c ? "scale-125 shadow-lg" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c, borderColor: accentColor === c ? "var(--ink)" : "var(--glass-border)" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between rounded-2xl p-4" style={{ border: `1px solid var(--glass-border)`, background: "var(--glass-bg)" }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--ink-dim)" }}>
                    <Bell size={16} style={{ color: "var(--ink-faint)" }} /> Sound Notifications
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-faint)" }}>Play a subtle ring on receiving messages</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMuteSounds(!muteSounds)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{ background: !muteSounds ? "var(--active-border)" : "var(--glass-border)" }}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    style={{ transform: !muteSounds ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl p-4" style={{ border: `1px solid var(--glass-border)`, background: "var(--glass-bg)" }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--ink-dim)" }}>
                    <Palette size={16} style={{ color: "var(--ink-faint)" }} /> Ambient Glow
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-faint)" }}>Enable translucent glass effects</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAmbientGlow(!ambientGlow)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{ background: ambientGlow ? "var(--active-border)" : "var(--glass-border)" }}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    style={{ transform: ambientGlow ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl p-4" style={{ border: `1px solid var(--glass-border)`, background: "var(--glass-bg)" }}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--ink-dim)" }}>
                    <Bell size={16} style={{ color: "var(--ink-faint)" }} /> Email Digests
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-faint)" }}>Receive a daily summary of unread messages</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailDigestEnabled(!emailDigestEnabled)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{ background: emailDigestEnabled ? "var(--active-border)" : "var(--glass-border)" }}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    style={{ transform: emailDigestEnabled ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              <div className="rounded-2xl p-4 space-y-3" style={{ border: `1px solid var(--glass-border)`, background: "var(--glass-bg)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--ink-dim)" }}>
                      <EyeOff size={16} style={{ color: "var(--ink-faint)" }} /> Scheduled Do-Not-Disturb
                    </span>
                    <span className="text-xs" style={{ color: "var(--ink-faint)" }}>Silence all notifications during specific hours</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDndEnabled(!dndEnabled)}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{ background: dndEnabled ? "var(--active-border)" : "var(--glass-border)" }}
                  >
                    <span
                      className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                      style={{ transform: dndEnabled ? "translateX(20px)" : "translateX(0)" }}
                    />
                  </button>
                </div>
                {dndEnabled && (
                  <div className="flex gap-4 pt-2 border-t border-white/5">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Start Time</label>
                      <input
                        type="time"
                        value={dndStart}
                        onChange={(e) => setDndStart(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-accent text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>End Time</label>
                      <input
                        type="time"
                        value={dndEnd}
                        onChange={(e) => setDndEnd(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-accent text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Version & Update Checks */}
              <div className="pt-4" style={{ borderTop: `1px solid var(--glass-border)` }}>
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
          style={{ borderTop: `1px solid var(--glass-border)`, background: "var(--glass-bg)" }}
        >
          {user?.role && ["SUPER_ADMIN", "ADMIN", "MODERATOR", "SUPPORT"].includes(user.role) && (
            <Link
              href="/admin"
              className="flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[rgba(124,58,237,0.3)]"
              style={{ background: "rgba(124, 58, 237, 0.15)", border: "1px solid rgba(124, 58, 237, 0.35)", color: "#a78bfa" }}
            >
              <Lock size={12} /> Launch Admin Panel
            </Link>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-wider transition"
              style={{ background: "var(--glass-bg)", border: `1px solid var(--glass-border)`, color: "var(--ink-dim)" }}
            >
              Cancel
            </button>
            <button
              onClick={() => updateProfile.mutate()}
              disabled={!username || !displayName || updateProfile.isPending}
              className="flex-1 rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
          <p className="text-center text-[10px] font-semibold tracking-wider uppercase" style={{ color: "var(--ink-faint)" }}>
            WispEcho App v1.3.1
          </p>
          </div>
        </motion.div>
      </div>

      {/* Theme Editor Modal */}
      {showThemeEditor && (
        <ThemeEditor onClose={() => setShowThemeEditor(false)} />
      )}
    </Portal>
  );
}
