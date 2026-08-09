// ─── Theme System ─────────────────────────────────────────────────────────────
// Central theme definitions for WispEcho. Each preset defines all CSS variable
// values so the entire UI reskins by swapping variables — zero component changes.

export interface ThemeColors {
  bg: string;
  ink: string;
  inkDim: string;
  inkFaint: string;
  glassBg: string;
  glassBgStrong: string;
  glassBorder: string;
  glassBorderStrong: string;
  bubbleTheirs: string;
  bubbleTheirsBorder: string;
  bubbleMine: string;
  bubbleMineBorder: string;
  hoverBg: string;
  hoverBorder: string;
  activeBg: string;
  activeBorder: string;
  searchBg: string;
  searchBorder: string;
  meCardBg: string;
  meCardBorder: string;
  composerBg: string;
  composerBorder: string;
  iconBtnHover: string;
  sendBtnBg: string;
}

export interface ThemeEffects {
  blur: number;
  borderRadius: number;
  glassOpacity: number;
}

export interface ChatBackground {
  type: "solid" | "gradient" | "image" | "pattern";
  value: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  premium: boolean;
  emoji: string;
  mode: "dark" | "light";
  colors: ThemeColors;
  effects: ThemeEffects;
  chatBackground?: ChatBackground;
}

// ─── Preset Themes ────────────────────────────────────────────────────────────

export const themes: Record<string, ThemeDefinition> = {
  default: {
    id: "default",
    name: "WispEcho",
    premium: false,
    emoji: "✨",
    mode: "dark",
    colors: {
      bg: "#050505",
      ink: "#ffffff",
      inkDim: "rgba(255,255,255,0.7)",
      inkFaint: "rgba(255,255,255,0.45)",
      glassBg: "rgba(255,255,255,0.04)",
      glassBgStrong: "rgba(30, 30, 30, 0.85)",
      glassBorder: "rgba(255,255,255,0.08)",
      glassBorderStrong: "rgba(255,255,255,0.15)",
      bubbleTheirs: "rgba(255,255,255,0.04)",
      bubbleTheirsBorder: "rgba(255,255,255,0.04)",
      bubbleMine: "rgba(255,255,255,0.09)",
      bubbleMineBorder: "rgba(255,255,255,0.09)",
      hoverBg: "rgba(255,255,255,0.03)",
      hoverBorder: "rgba(255,255,255,0.06)",
      activeBg: "rgba(255,255,255,0.06)",
      activeBorder: "rgba(255,255,255,0.09)",
      searchBg: "rgba(255,255,255,0.02)",
      searchBorder: "rgba(255,255,255,0.05)",
      meCardBg: "rgba(255,255,255,0.02)",
      meCardBorder: "rgba(255,255,255,0.05)",
      composerBg: "rgba(255,255,255,0.03)",
      composerBorder: "rgba(255,255,255,0.06)",
      iconBtnHover: "rgba(255,255,255,0.06)",
      sendBtnBg: "rgba(255,255,255,0.1)",
    },
    effects: { blur: 24, borderRadius: 24, glassOpacity: 0.04 },
  },

  light: {
    id: "light",
    name: "Light",
    premium: false,
    emoji: "☀️",
    mode: "light",
    colors: {
      bg: "#ffffff",
      ink: "#000000",
      inkDim: "#333333",
      inkFaint: "#666666",
      glassBg: "rgba(245, 245, 247, 0.85)",
      glassBgStrong: "rgba(255, 255, 255, 0.95)",
      glassBorder: "rgba(0, 0, 0, 0.08)",
      glassBorderStrong: "rgba(0, 0, 0, 0.15)",
      bubbleTheirs: "#f1f1f3",
      bubbleTheirsBorder: "#e5e5ea",
      bubbleMine: "#007aff",
      bubbleMineBorder: "#007aff",
      hoverBg: "rgba(0, 0, 0, 0.05)",
      hoverBorder: "rgba(0, 0, 0, 0.1)",
      activeBg: "rgba(0, 0, 0, 0.08)",
      activeBorder: "rgba(0, 0, 0, 0.15)",
      searchBg: "#f1f1f2",
      searchBorder: "#e4e4e7",
      meCardBg: "rgba(245, 245, 247, 0.9)",
      meCardBorder: "rgba(0, 0, 0, 0.1)",
      composerBg: "rgba(255, 255, 255, 0.9)",
      composerBorder: "rgba(0, 0, 0, 0.1)",
      iconBtnHover: "rgba(0, 0, 0, 0.08)",
      sendBtnBg: "rgba(0, 0, 0, 0.08)",
    },
    effects: { blur: 24, borderRadius: 24, glassOpacity: 0.85 },
  },

  midnight: {
    id: "midnight",
    name: "Midnight",
    premium: false,
    emoji: "🌙",
    mode: "dark",
    colors: {
      bg: "#05070d",
      ink: "#f8fafc",
      inkDim: "rgba(248,250,252,0.7)",
      inkFaint: "rgba(148,163,184,0.8)",
      glassBg: "rgba(11,16,32,0.6)",
      glassBgStrong: "rgba(15,22,44,0.9)",
      glassBorder: "rgba(59,130,246,0.12)",
      glassBorderStrong: "rgba(59,130,246,0.25)",
      bubbleTheirs: "rgba(17,24,39,0.8)",
      bubbleTheirsBorder: "rgba(59,130,246,0.08)",
      bubbleMine: "rgba(37,99,235,0.35)",
      bubbleMineBorder: "rgba(59,130,246,0.2)",
      hoverBg: "rgba(59,130,246,0.06)",
      hoverBorder: "rgba(59,130,246,0.1)",
      activeBg: "rgba(59,130,246,0.1)",
      activeBorder: "rgba(59,130,246,0.18)",
      searchBg: "rgba(11,16,32,0.5)",
      searchBorder: "rgba(59,130,246,0.08)",
      meCardBg: "rgba(11,16,32,0.4)",
      meCardBorder: "rgba(59,130,246,0.08)",
      composerBg: "rgba(11,16,32,0.5)",
      composerBorder: "rgba(59,130,246,0.1)",
      iconBtnHover: "rgba(59,130,246,0.1)",
      sendBtnBg: "rgba(59,130,246,0.15)",
    },
    effects: { blur: 28, borderRadius: 24, glassOpacity: 0.06 },
  },

  crimson: {
    id: "crimson",
    name: "Crimson",
    premium: true,
    emoji: "🔥",
    mode: "dark",
    colors: {
      bg: "#0d0507",
      ink: "#fff1f2",
      inkDim: "rgba(255,241,242,0.7)",
      inkFaint: "rgba(253,164,175,0.7)",
      glassBg: "rgba(24,9,13,0.6)",
      glassBgStrong: "rgba(30,12,18,0.9)",
      glassBorder: "rgba(225,29,72,0.12)",
      glassBorderStrong: "rgba(225,29,72,0.25)",
      bubbleTheirs: "rgba(39,16,20,0.8)",
      bubbleTheirsBorder: "rgba(225,29,72,0.08)",
      bubbleMine: "rgba(190,18,60,0.35)",
      bubbleMineBorder: "rgba(225,29,72,0.2)",
      hoverBg: "rgba(225,29,72,0.06)",
      hoverBorder: "rgba(225,29,72,0.1)",
      activeBg: "rgba(225,29,72,0.1)",
      activeBorder: "rgba(225,29,72,0.18)",
      searchBg: "rgba(24,9,13,0.5)",
      searchBorder: "rgba(225,29,72,0.08)",
      meCardBg: "rgba(24,9,13,0.4)",
      meCardBorder: "rgba(225,29,72,0.08)",
      composerBg: "rgba(24,9,13,0.5)",
      composerBorder: "rgba(225,29,72,0.1)",
      iconBtnHover: "rgba(225,29,72,0.1)",
      sendBtnBg: "rgba(225,29,72,0.15)",
    },
    effects: { blur: 24, borderRadius: 24, glassOpacity: 0.06 },
  },

  aurora: {
    id: "aurora",
    name: "Aurora",
    premium: true,
    emoji: "🌌",
    mode: "dark",
    colors: {
      bg: "#07111f",
      ink: "#f8fafc",
      inkDim: "rgba(248,250,252,0.7)",
      inkFaint: "rgba(148,163,184,0.7)",
      glassBg: "rgba(13,27,42,0.5)",
      glassBgStrong: "rgba(16,34,52,0.9)",
      glassBorder: "rgba(34,211,238,0.12)",
      glassBorderStrong: "rgba(34,211,238,0.25)",
      bubbleTheirs: "rgba(19,40,58,0.8)",
      bubbleTheirsBorder: "rgba(34,211,238,0.08)",
      bubbleMine: "rgba(8,145,178,0.3)",
      bubbleMineBorder: "rgba(34,211,238,0.2)",
      hoverBg: "rgba(34,211,238,0.06)",
      hoverBorder: "rgba(34,211,238,0.1)",
      activeBg: "rgba(34,211,238,0.1)",
      activeBorder: "rgba(34,211,238,0.18)",
      searchBg: "rgba(13,27,42,0.5)",
      searchBorder: "rgba(34,211,238,0.08)",
      meCardBg: "rgba(13,27,42,0.4)",
      meCardBorder: "rgba(34,211,238,0.08)",
      composerBg: "rgba(13,27,42,0.5)",
      composerBorder: "rgba(34,211,238,0.1)",
      iconBtnHover: "rgba(34,211,238,0.1)",
      sendBtnBg: "rgba(34,211,238,0.15)",
    },
    effects: { blur: 32, borderRadius: 24, glassOpacity: 0.05 },
    chatBackground: { type: "gradient", value: "linear-gradient(135deg, #07111f 0%, #0c2233 50%, #071b2e 100%)" },
  },

  ocean: {
    id: "ocean",
    name: "Ocean",
    premium: true,
    emoji: "🌊",
    mode: "dark",
    colors: {
      bg: "#04101a",
      ink: "#e0f2fe",
      inkDim: "rgba(224,242,254,0.7)",
      inkFaint: "rgba(125,211,252,0.6)",
      glassBg: "rgba(7,23,38,0.6)",
      glassBgStrong: "rgba(10,30,50,0.9)",
      glassBorder: "rgba(14,165,233,0.12)",
      glassBorderStrong: "rgba(14,165,233,0.25)",
      bubbleTheirs: "rgba(12,34,55,0.8)",
      bubbleTheirsBorder: "rgba(14,165,233,0.08)",
      bubbleMine: "rgba(2,132,199,0.3)",
      bubbleMineBorder: "rgba(14,165,233,0.2)",
      hoverBg: "rgba(14,165,233,0.06)",
      hoverBorder: "rgba(14,165,233,0.1)",
      activeBg: "rgba(14,165,233,0.1)",
      activeBorder: "rgba(14,165,233,0.18)",
      searchBg: "rgba(7,23,38,0.5)",
      searchBorder: "rgba(14,165,233,0.08)",
      meCardBg: "rgba(7,23,38,0.4)",
      meCardBorder: "rgba(14,165,233,0.08)",
      composerBg: "rgba(7,23,38,0.5)",
      composerBorder: "rgba(14,165,233,0.1)",
      iconBtnHover: "rgba(14,165,233,0.1)",
      sendBtnBg: "rgba(14,165,233,0.15)",
    },
    effects: { blur: 28, borderRadius: 22, glassOpacity: 0.06 },
    chatBackground: { type: "gradient", value: "linear-gradient(180deg, #04101a 0%, #082640 100%)" },
  },

  sakura: {
    id: "sakura",
    name: "Sakura",
    premium: true,
    emoji: "🌸",
    mode: "light",
    colors: {
      bg: "#fef7f8",
      ink: "#1a0510",
      inkDim: "rgba(26,5,16,0.7)",
      inkFaint: "rgba(26,5,16,0.45)",
      glassBg: "rgba(254,226,233,0.5)",
      glassBgStrong: "rgba(254,240,244,0.95)",
      glassBorder: "rgba(244,63,94,0.12)",
      glassBorderStrong: "rgba(244,63,94,0.2)",
      bubbleTheirs: "rgba(254,226,233,0.6)",
      bubbleTheirsBorder: "rgba(244,63,94,0.1)",
      bubbleMine: "rgba(244,63,94,0.2)",
      bubbleMineBorder: "rgba(244,63,94,0.25)",
      hoverBg: "rgba(244,63,94,0.06)",
      hoverBorder: "rgba(244,63,94,0.1)",
      activeBg: "rgba(244,63,94,0.1)",
      activeBorder: "rgba(244,63,94,0.18)",
      searchBg: "rgba(254,226,233,0.4)",
      searchBorder: "rgba(244,63,94,0.1)",
      meCardBg: "rgba(254,226,233,0.3)",
      meCardBorder: "rgba(244,63,94,0.1)",
      composerBg: "rgba(254,240,244,0.7)",
      composerBorder: "rgba(244,63,94,0.1)",
      iconBtnHover: "rgba(244,63,94,0.1)",
      sendBtnBg: "rgba(244,63,94,0.12)",
    },
    effects: { blur: 24, borderRadius: 28, glassOpacity: 0.5 },
  },

  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk",
    premium: true,
    emoji: "🤖",
    mode: "dark",
    colors: {
      bg: "#0a0a0a",
      ink: "#e4ff1a",
      inkDim: "rgba(228,255,26,0.7)",
      inkFaint: "rgba(228,255,26,0.4)",
      glassBg: "rgba(15,15,15,0.7)",
      glassBgStrong: "rgba(20,20,20,0.95)",
      glassBorder: "rgba(228,255,26,0.12)",
      glassBorderStrong: "rgba(228,255,26,0.25)",
      bubbleTheirs: "rgba(20,20,20,0.8)",
      bubbleTheirsBorder: "rgba(228,255,26,0.06)",
      bubbleMine: "rgba(228,255,26,0.12)",
      bubbleMineBorder: "rgba(228,255,26,0.2)",
      hoverBg: "rgba(228,255,26,0.04)",
      hoverBorder: "rgba(228,255,26,0.08)",
      activeBg: "rgba(228,255,26,0.08)",
      activeBorder: "rgba(228,255,26,0.15)",
      searchBg: "rgba(15,15,15,0.6)",
      searchBorder: "rgba(228,255,26,0.08)",
      meCardBg: "rgba(15,15,15,0.4)",
      meCardBorder: "rgba(228,255,26,0.08)",
      composerBg: "rgba(15,15,15,0.6)",
      composerBorder: "rgba(228,255,26,0.1)",
      iconBtnHover: "rgba(228,255,26,0.08)",
      sendBtnBg: "rgba(228,255,26,0.12)",
    },
    effects: { blur: 16, borderRadius: 8, glassOpacity: 0.07 },
  },

  glass: {
    id: "glass",
    name: "Glass",
    premium: true,
    emoji: "🧊",
    mode: "dark",
    colors: {
      bg: "#0f0f14",
      ink: "#ffffff",
      inkDim: "rgba(255,255,255,0.75)",
      inkFaint: "rgba(255,255,255,0.45)",
      glassBg: "rgba(255,255,255,0.06)",
      glassBgStrong: "rgba(255,255,255,0.1)",
      glassBorder: "rgba(255,255,255,0.12)",
      glassBorderStrong: "rgba(255,255,255,0.2)",
      bubbleTheirs: "rgba(255,255,255,0.06)",
      bubbleTheirsBorder: "rgba(255,255,255,0.1)",
      bubbleMine: "rgba(255,255,255,0.12)",
      bubbleMineBorder: "rgba(255,255,255,0.18)",
      hoverBg: "rgba(255,255,255,0.04)",
      hoverBorder: "rgba(255,255,255,0.08)",
      activeBg: "rgba(255,255,255,0.08)",
      activeBorder: "rgba(255,255,255,0.14)",
      searchBg: "rgba(255,255,255,0.04)",
      searchBorder: "rgba(255,255,255,0.08)",
      meCardBg: "rgba(255,255,255,0.04)",
      meCardBorder: "rgba(255,255,255,0.08)",
      composerBg: "rgba(255,255,255,0.06)",
      composerBorder: "rgba(255,255,255,0.1)",
      iconBtnHover: "rgba(255,255,255,0.08)",
      sendBtnBg: "rgba(255,255,255,0.12)",
    },
    effects: { blur: 40, borderRadius: 28, glassOpacity: 0.06 },
  },

  minimal: {
    id: "minimal",
    name: "Minimal",
    premium: true,
    emoji: "◻️",
    mode: "dark",
    colors: {
      bg: "#111111",
      ink: "#e5e5e5",
      inkDim: "rgba(229,229,229,0.65)",
      inkFaint: "rgba(229,229,229,0.35)",
      glassBg: "rgba(25,25,25,0.9)",
      glassBgStrong: "rgba(30,30,30,0.95)",
      glassBorder: "rgba(255,255,255,0.06)",
      glassBorderStrong: "rgba(255,255,255,0.1)",
      bubbleTheirs: "rgba(35,35,35,0.9)",
      bubbleTheirsBorder: "rgba(255,255,255,0.04)",
      bubbleMine: "rgba(50,50,50,0.9)",
      bubbleMineBorder: "rgba(255,255,255,0.06)",
      hoverBg: "rgba(255,255,255,0.03)",
      hoverBorder: "rgba(255,255,255,0.05)",
      activeBg: "rgba(255,255,255,0.05)",
      activeBorder: "rgba(255,255,255,0.08)",
      searchBg: "rgba(25,25,25,0.8)",
      searchBorder: "rgba(255,255,255,0.05)",
      meCardBg: "rgba(25,25,25,0.6)",
      meCardBorder: "rgba(255,255,255,0.04)",
      composerBg: "rgba(25,25,25,0.8)",
      composerBorder: "rgba(255,255,255,0.06)",
      iconBtnHover: "rgba(255,255,255,0.05)",
      sendBtnBg: "rgba(255,255,255,0.08)",
    },
    effects: { blur: 0, borderRadius: 12, glassOpacity: 0.9 },
  },
};

// ─── Theme Application ────────────────────────────────────────────────────────

const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  bg: "--bg",
  ink: "--ink",
  inkDim: "--ink-dim",
  inkFaint: "--ink-faint",
  glassBg: "--glass-bg",
  glassBgStrong: "--glass-bg-strong",
  glassBorder: "--glass-border",
  glassBorderStrong: "--glass-border-strong",
  bubbleTheirs: "--bubble-theirs",
  bubbleTheirsBorder: "--bubble-theirs-border",
  bubbleMine: "--bubble-mine",
  bubbleMineBorder: "--bubble-mine-border",
  hoverBg: "--hover-bg",
  hoverBorder: "--hover-border",
  activeBg: "--active-bg",
  activeBorder: "--active-border",
  searchBg: "--search-bg",
  searchBorder: "--search-border",
  meCardBg: "--me-card-bg",
  meCardBorder: "--me-card-border",
  composerBg: "--composer-bg",
  composerBorder: "--composer-border",
  iconBtnHover: "--icon-btn-hover",
  sendBtnBg: "--send-btn-bg",
};

/**
 * Apply a theme to the document root by setting all CSS variables.
 * Works for both preset and custom themes.
 */
export function applyThemeToDOM(theme: ThemeDefinition) {
  const root = document.documentElement;

  // Apply all color variables
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(cssVar, theme.colors[key as keyof ThemeColors]);
  }

  // Apply effect variables
  root.style.setProperty("--blur", `${theme.effects.blur}px`);
  root.style.setProperty("--panel-radius", `${theme.effects.borderRadius}px`);
  root.style.setProperty("--glass-opacity", `${theme.effects.glassOpacity}`);

  // Apply chat background
  if (theme.chatBackground) {
    root.style.setProperty("--chat-bg-type", theme.chatBackground.type);
    root.style.setProperty("--chat-bg-value", theme.chatBackground.value);
  } else {
    root.style.removeProperty("--chat-bg-type");
    root.style.removeProperty("--chat-bg-value");
  }

  // Toggle light/dark class for scrollbars, emoji picker, etc.
  if (theme.mode === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }
}

/**
 * Build a ThemeDefinition from custom theme data (from DB or localStorage).
 */
export function buildCustomTheme(data: {
  id: string;
  name: string;
  colors: Partial<ThemeColors>;
  effects?: Partial<ThemeEffects>;
  chatBg?: ChatBackground | null;
}): ThemeDefinition {
  // Start from the default theme and override
  const base = themes.default;
  return {
    id: `custom_${data.id}`,
    name: data.name,
    premium: false,
    emoji: "🎨",
    mode: isLightBackground(data.colors.bg || base.colors.bg) ? "light" : "dark",
    colors: { ...base.colors, ...data.colors },
    effects: { ...base.effects, ...data.effects },
    chatBackground: data.chatBg || undefined,
  };
}

/**
 * Simple heuristic to detect if a hex color is "light"
 */
function isLightBackground(color: string): boolean {
  // Only works for hex colors
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

/** List of all preset theme IDs in display order */
export const THEME_ORDER = [
  "default",
  "light",
  "midnight",
  "crimson",
  "aurora",
  "ocean",
  "sakura",
  "cyberpunk",
  "glass",
  "minimal",
];
