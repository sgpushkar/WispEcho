"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { X, Save, RotateCcw, Upload, Image as ImageIcon, Palette, Crown, Lock } from "lucide-react";
import { Portal } from "../ui/Portal";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  themes,
  applyThemeToDOM,
  buildCustomTheme,
  type ThemeColors,
  type ThemeEffects,
  type ChatBackground,
  type ThemeDefinition,
} from "@/lib/themes";

// ─── Color Picker ─────────────────────────────────────────────────────────────
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium" style={{ color: "var(--ink-dim)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-lg border-0 cursor-pointer"
          style={{ background: "transparent" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[100px] text-[11px] rounded-lg px-2 py-1.5 font-mono"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--ink)", outline: "none" }}
        />
      </div>
    </div>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────
function SliderField({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "var(--ink-dim)" }}>{label}</span>
        <span className="text-[10px] font-mono" style={{ color: "var(--ink-faint)" }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: "var(--glass-border)" }}
      />
    </div>
  );
}

export function ThemeEditor({ onClose }: { onClose: () => void }) {
  const { applyCustomTheme, getActiveTheme, themeId } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Start from the current theme's colors
  const baseTheme = getActiveTheme();

  const [name, setName] = useState("My Theme");
  const [colors, setColors] = useState<ThemeColors>({ ...baseTheme.colors });
  const [effects, setEffects] = useState<ThemeEffects>({ ...baseTheme.effects });
  const [chatBgType, setChatBgType] = useState<"none" | "solid" | "gradient" | "image">("none");
  const [chatBgValue, setChatBgValue] = useState("");
  const [gradientFrom, setGradientFrom] = useState("#07111f");
  const [gradientTo, setGradientTo] = useState("#0c2233");
  const [gradientAngle, setGradientAngle] = useState(135);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"colors" | "effects" | "background">("colors");

  // Fetch existing custom themes
  const { data: customThemesData } = useQuery({
    queryKey: ["customThemes"],
    queryFn: async () => (await api.get("/themes")).data.themes,
  });

  const customThemes = customThemesData || [];

  // Apply live preview
  const previewTheme = useCallback(() => {
    const chatBg: ChatBackground | undefined =
      chatBgType === "solid" ? { type: "solid", value: chatBgValue } :
      chatBgType === "gradient" ? { type: "gradient", value: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})` } :
      chatBgType === "image" ? { type: "image", value: chatBgValue } :
      undefined;

    const theme = buildCustomTheme({
      id: editingId || "preview",
      name,
      colors,
      effects,
      chatBg: chatBg || null,
    });
    applyThemeToDOM(theme);
  }, [colors, effects, chatBgType, chatBgValue, gradientFrom, gradientTo, gradientAngle, name, editingId]);

  useEffect(() => {
    previewTheme();
  }, [previewTheme]);

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  // Background image upload
  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBg(true);
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
      setChatBgValue(data.secure_url);
    } catch {
      alert("Failed to upload image");
    } finally {
      setIsUploadingBg(false);
    }
  };

  // Save to backend
  const saveMutation = useMutation({
    mutationFn: async () => {
      const chatBg: ChatBackground | null =
        chatBgType === "solid" ? { type: "solid", value: chatBgValue } :
        chatBgType === "gradient" ? { type: "gradient", value: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})` } :
        chatBgType === "image" ? { type: "image", value: chatBgValue } :
        null;

      const body = { name, colors, effects, chatBg };

      if (editingId) {
        return api.patch(`/themes/${editingId}`, body);
      } else {
        return api.post("/themes", body);
      }
    },
    onSuccess: (res) => {
      const saved = res.data.theme;
      queryClient.invalidateQueries({ queryKey: ["customThemes"] });

      const chatBg: ChatBackground | null =
        chatBgType === "solid" ? { type: "solid", value: chatBgValue } :
        chatBgType === "gradient" ? { type: "gradient", value: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})` } :
        chatBgType === "image" ? { type: "image", value: chatBgValue } :
        null;

      applyCustomTheme({ id: saved.id, name, colors, effects, chatBg });
      onClose();
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Failed to save theme");
    },
  });

  // Reset to default
  const handleReset = () => {
    const def = themes.default;
    setColors({ ...def.colors });
    setEffects({ ...def.effects });
    setChatBgType("none");
    setChatBgValue("");
  };

  // Load an existing custom theme for editing
  const loadCustomTheme = (ct: any) => {
    setEditingId(ct.id);
    setName(ct.name);
    setColors({ ...themes.default.colors, ...ct.colors });
    setEffects({ ...themes.default.effects, ...ct.effects });
    if (ct.chatBg) {
      if (ct.chatBg.type === "solid") {
        setChatBgType("solid");
        setChatBgValue(ct.chatBg.value);
      } else if (ct.chatBg.type === "gradient") {
        setChatBgType("gradient");
        // Parse gradient values if possible
      } else if (ct.chatBg.type === "image") {
        setChatBgType("image");
        setChatBgValue(ct.chatBg.value);
      }
    }
  };

  // Delete custom theme
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/themes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customThemes"] });
      // Revert to default if the deleted theme was active
      const { applyTheme } = useUIStore.getState();
      applyTheme("default");
    },
  });

  const COLOR_GROUPS: { label: string; keys: (keyof ThemeColors)[] }[] = [
    { label: "Base", keys: ["bg", "ink", "inkDim", "inkFaint"] },
    { label: "Glass", keys: ["glassBg", "glassBgStrong", "glassBorder", "glassBorderStrong"] },
    { label: "Messages", keys: ["bubbleTheirs", "bubbleTheirsBorder", "bubbleMine", "bubbleMineBorder"] },
    { label: "Interactive", keys: ["hoverBg", "hoverBorder", "activeBg", "activeBorder"] },
    { label: "Components", keys: ["searchBg", "searchBorder", "composerBg", "composerBorder", "sendBtnBg", "iconBtnHover"] },
  ];

  const NICE_NAMES: Record<string, string> = {
    bg: "Background", ink: "Text", inkDim: "Text Dim", inkFaint: "Text Faint",
    glassBg: "Panel", glassBgStrong: "Panel Strong", glassBorder: "Border", glassBorderStrong: "Border Strong",
    bubbleTheirs: "Received", bubbleTheirsBorder: "Received Border", bubbleMine: "Sent", bubbleMineBorder: "Sent Border",
    hoverBg: "Hover", hoverBorder: "Hover Border", activeBg: "Active", activeBorder: "Active Border",
    searchBg: "Search", searchBorder: "Search Border", composerBg: "Composer", composerBorder: "Composer Border",
    sendBtnBg: "Send Button", iconBtnHover: "Icon Hover",
    meCardBg: "Profile Card", meCardBorder: "Profile Border",
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(16px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative flex h-[620px] w-full max-w-lg flex-col overflow-hidden rounded-3xl"
          style={{
            background: "var(--glass-bg-strong)",
            border: `1px solid var(--glass-border-strong)`,
            backdropFilter: "blur(40px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid var(--glass-border)` }}>
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--ink)" }}>
              <Palette size={18} style={{ color: "var(--ink-dim)" }} />
              {editingId ? "Edit Theme" : "Create Theme"}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="rounded-full p-1.5 transition hover:bg-[var(--hover-bg)]"
                style={{ color: "var(--ink-faint)" }}
                title="Reset to defaults"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => {
                  // Restore original theme on close
                  const { applyTheme, themeId } = useUIStore.getState();
                  if (themeId.startsWith("custom_")) {
                    // Re-apply
                  } else if (themes[themeId]) {
                    applyTheme(themeId);
                  } else {
                    applyTheme("default");
                  }
                  onClose();
                }}
                className="rounded-full p-1.5 transition hover:bg-[var(--hover-bg)]"
                style={{ color: "var(--ink-faint)" }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Theme Name */}
          <div className="px-6 pt-4 pb-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Theme name..."
              className="w-full text-sm font-semibold rounded-xl px-4 py-2.5"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--ink)", outline: "none" }}
            />
          </div>

          {/* Section tabs */}
          <div className="flex px-6 gap-1 pt-1 pb-3">
            {(["colors", "effects", "background"] as const).map((sec) => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-xl transition"
                style={{
                  background: activeSection === sec ? "var(--active-bg)" : "transparent",
                  color: activeSection === sec ? "var(--ink)" : "var(--ink-faint)",
                  border: `1px solid ${activeSection === sec ? "var(--active-border)" : "transparent"}`,
                }}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
            {activeSection === "colors" && (
              <>
                {COLOR_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>
                      {group.label}
                    </span>
                    <div className="space-y-2 rounded-2xl p-3" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                      {group.keys.map((key) => (
                        <ColorField
                          key={key}
                          label={NICE_NAMES[key] || key}
                          value={colors[key]}
                          onChange={(v) => updateColor(key, v)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeSection === "effects" && (
              <div className="space-y-4">
                <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                  <SliderField
                    label="Blur Strength"
                    value={effects.blur}
                    min={0} max={40} step={2} unit="px"
                    onChange={(v) => setEffects((p) => ({ ...p, blur: v }))}
                  />
                  <SliderField
                    label="Border Radius"
                    value={effects.borderRadius}
                    min={4} max={32} step={2} unit="px"
                    onChange={(v) => setEffects((p) => ({ ...p, borderRadius: v }))}
                  />
                  <SliderField
                    label="Glass Opacity"
                    value={effects.glassOpacity}
                    min={0} max={0.3} step={0.01} unit=""
                    onChange={(v) => setEffects((p) => ({ ...p, glassOpacity: v }))}
                  />
                </div>

                {/* Existing custom themes */}
                {customThemes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>
                      Your Themes
                    </span>
                    {customThemes.map((ct: any) => (
                      <div
                        key={ct.id}
                        className="flex items-center justify-between rounded-xl p-3"
                        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ background: ct.colors?.bg || "#000" }} />
                          <span className="text-xs font-medium" style={{ color: "var(--ink)" }}>{ct.name}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => loadCustomTheme(ct)}
                            className="text-[10px] px-2 py-1 rounded-lg transition"
                            style={{ background: "var(--hover-bg)", color: "var(--ink-dim)" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(ct.id)}
                            className="text-[10px] px-2 py-1 rounded-lg transition text-red-400 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === "background" && (
              <div className="space-y-4">
                {/* Background type selector */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--ink-faint)" }}>
                    Chat Background
                    {!user?.isPro && <Crown size={10} style={{ color: "#f59e0b" }} />}
                  </span>
                  
                  {!user?.isPro ? (
                    <div className="rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))", border: "1px solid rgba(245,158,11,0.15)" }}>
                      <Lock size={20} style={{ color: "#f59e0b" }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#f59e0b" }}>Pro Feature</span>
                      <p className="text-[10px] leading-relaxed" style={{ color: "var(--ink-dim)" }}>
                        Upgrade to Pro to unlock custom chat backgrounds (solid colors, gradients, and images).
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {(["none", "solid", "gradient", "image"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setChatBgType(type)}
                          className="py-2 text-[10px] font-semibold uppercase tracking-wider rounded-xl transition"
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
                  )}
                </div>

                {user?.isPro && chatBgType === "solid" && (
                  <div className="rounded-2xl p-4" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                    <ColorField
                      label="Background Color"
                      value={chatBgValue || "#0a0a0f"}
                      onChange={(v) => setChatBgValue(v)}
                    />
                  </div>
                )}

                {user?.isPro && chatBgType === "gradient" && (
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                    <ColorField label="From" value={gradientFrom} onChange={setGradientFrom} />
                    <ColorField label="To" value={gradientTo} onChange={setGradientTo} />
                    <SliderField
                      label="Angle"
                      value={gradientAngle}
                      min={0} max={360} step={15} unit="°"
                      onChange={setGradientAngle}
                    />
                    {/* Preview */}
                    <div
                      className="h-16 rounded-xl"
                      style={{ background: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`, border: "1px solid var(--glass-border)" }}
                    />
                  </div>
                )}

                {user?.isPro && chatBgType === "image" && (
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                    <div className="relative">
                      <label
                        className="flex flex-col items-center justify-center h-24 rounded-xl cursor-pointer transition"
                        style={{ border: "2px dashed var(--glass-border)" }}
                      >
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
                    {chatBgValue && (
                      <input
                        value={chatBgValue}
                        onChange={(e) => setChatBgValue(e.target.value)}
                        placeholder="Image URL..."
                        className="w-full text-[11px] rounded-xl px-3 py-2 font-mono"
                        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--ink)", outline: "none" }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 flex gap-3" style={{ borderTop: `1px solid var(--glass-border)` }}>
            <button
              onClick={() => {
                // Revert to previous theme
                const { applyTheme, themeId } = useUIStore.getState();
                if (themes[themeId]) applyTheme(themeId);
                else applyTheme("default");
                onClose();
              }}
              className="flex-1 rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-wider transition"
              style={{ background: "var(--glass-bg)", border: `1px solid var(--glass-border)`, color: "var(--ink-dim)" }}
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!name || saveMutation.isPending}
              className="flex-1 rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
            >
              <Save size={14} />
              {saveMutation.isPending ? "Saving..." : "Save Theme"}
            </button>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
