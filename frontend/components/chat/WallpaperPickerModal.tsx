"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, Lock, Image as ImageIcon } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ChatBackground } from "@/lib/themes";
import { api } from "@/lib/api";

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 text-[11px] rounded px-2 py-1 font-mono uppercase"
          style={{ background: "var(--glass-border)", color: "var(--ink)", border: "none", outline: "none" }}
        />
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>{label}</span>
        <span className="text-[11px] font-mono" style={{ color: "var(--ink)" }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--active-bg)] h-1 rounded-full appearance-none bg-[var(--glass-border)] cursor-pointer"
      />
    </div>
  );
}

interface WallpaperPickerModalProps {
  onClose: () => void;
  onApplyGlobal: (bg: ChatBackground | null) => void;
  onApplyIndividual: (bg: ChatBackground | null) => void;
}

export function WallpaperPickerModal({ onClose, onApplyGlobal, onApplyIndividual }: WallpaperPickerModalProps) {
  const { user } = useAuthStore();
  const [chatBgType, setChatBgType] = useState<"none" | "solid" | "gradient" | "image">("none");
  const [chatBgValue, setChatBgValue] = useState("");
  const [gradientFrom, setGradientFrom] = useState("#0a0a0f");
  const [gradientTo, setGradientTo] = useState("#1a1a2e");
  const [gradientAngle, setGradientAngle] = useState(135);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [applyMode, setApplyMode] = useState<"global" | "individual">("global");

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingBg(true);
      const sigRes = await api.get("/upload/signature");
      const { signature, timestamp, cloudName, apiKey, folder, resourceType } = sigRes.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      const endpoint = resourceType === "video" ? "video" : "image";
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${endpoint}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const response = await uploadRes.json();
      setChatBgValue(response.secure_url);
    } catch (error) {
      console.error(error);
      alert("Failed to upload background");
    } finally {
      setIsUploadingBg(false);
    }
  };

  const constructChatBg = (): ChatBackground | null => {
    if (chatBgType === "none") return null;
    if (chatBgType === "solid") return { type: "solid", value: chatBgValue || "#0a0a0f" };
    if (chatBgType === "gradient") return { type: "gradient", value: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})` };
    if (chatBgType === "image") return { type: "image", value: chatBgValue };
    return null;
  };

  const handleApply = () => {
    const bg = constructChatBg();
    if (applyMode === "global") {
      onApplyGlobal(bg);
    } else {
      onApplyIndividual(bg);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "var(--panel-bg)", border: "1px solid var(--glass-border)", maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
              <ImageIcon size={18} style={{ color: "var(--ink)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color: "var(--ink)" }}>Chat Wallpaper</h2>
              <p className="text-[12px] opacity-60" style={{ color: "var(--ink-faint)" }}>Customize your background</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--glass-bg)] transition">
            <X size={20} style={{ color: "var(--ink)" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--ink-faint)" }}>Background Type</span>
            <div className="grid grid-cols-4 gap-2">
              {(["none", "solid", "gradient", "image"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChatBgType(type)}
                  className="py-2 text-[10px] font-semibold uppercase tracking-wider rounded-xl transition flex justify-center items-center gap-1"
                  style={{
                    background: chatBgType === type ? "var(--active-bg)" : "var(--glass-bg)",
                    color: chatBgType === type ? "var(--ink)" : "var(--ink-faint)",
                    border: `1px solid ${chatBgType === type ? "var(--active-border)" : "var(--glass-border)"}`,
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {chatBgType === "solid" && (
            <div className="rounded-2xl p-4" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
              <ColorField label="Color" value={chatBgValue || "#0a0a0f"} onChange={setChatBgValue} />
            </div>
          )}

          {chatBgType === "gradient" && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
              <ColorField label="From" value={gradientFrom} onChange={setGradientFrom} />
              <ColorField label="To" value={gradientTo} onChange={setGradientTo} />
              <SliderField label="Angle" value={gradientAngle} min={0} max={360} step={15} unit="°" onChange={setGradientAngle} />
              <div className="h-16 rounded-xl" style={{ background: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`, border: "1px solid var(--glass-border)" }} />
            </div>
          )}

          {chatBgType === "image" && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
              <div className="relative">
                <label className="flex flex-col items-center justify-center h-24 rounded-xl cursor-pointer transition" style={{ border: "2px dashed var(--glass-border)" }}>
                  {isUploadingBg ? (
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : chatBgValue ? (
                    <img src={chatBgValue} className="w-full h-full object-cover rounded-xl" alt="bg" />
                  ) : (
                    <>
                      <Upload size={20} style={{ color: "var(--ink-faint)" }} />
                      <span className="text-[10px] mt-1" style={{ color: "var(--ink-faint)" }}>Upload Image</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} disabled={isUploadingBg} />
                </label>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-4 border-t border-[var(--glass-border)]">
            <span className="text-[11px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--ink-faint)" }}>Apply To</span>
            <div className="flex gap-2">
              <button
                onClick={() => setApplyMode("global")}
                className="flex-1 py-3 text-xs font-semibold rounded-xl transition"
                style={{
                  background: applyMode === "global" ? "var(--active-bg)" : "var(--glass-bg)",
                  color: applyMode === "global" ? "var(--ink)" : "var(--ink-faint)",
                  border: `1px solid ${applyMode === "global" ? "var(--active-border)" : "var(--glass-border)"}`,
                }}
              >
                All Chats
              </button>
              
              <button
                onClick={() => {
                  if (user?.isPro) setApplyMode("individual");
                }}
                className={`flex-1 py-3 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1 ${!user?.isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  background: applyMode === "individual" ? "var(--active-bg)" : "var(--glass-bg)",
                  color: applyMode === "individual" ? "var(--ink)" : "var(--ink-faint)",
                  border: `1px solid ${applyMode === "individual" ? "var(--active-border)" : "var(--glass-border)"}`,
                }}
              >
                {!user?.isPro && <Lock size={12} />}
                This Chat Only
              </button>
            </div>
            {!user?.isPro && (
              <p className="text-[10px] text-center" style={{ color: "var(--ink-faint)" }}>
                Upgrade to Pro to set individual chat wallpapers.
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-[var(--glass-border)] shrink-0 flex justify-end gap-3" style={{ background: "var(--glass-bg)" }}>
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-xs font-bold transition hover:bg-[var(--glass-border)]" style={{ color: "var(--ink-faint)" }}>Cancel</button>
          <button onClick={handleApply} className="px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition hover:scale-105 active:scale-95" style={{ background: "var(--active-bg)", color: "var(--ink)" }}>Apply Wallpaper</button>
        </div>
      </motion.div>
    </div>
  );
}
