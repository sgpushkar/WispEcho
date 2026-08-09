import { create } from "zustand";
import { themes, applyThemeToDOM, buildCustomTheme, type ThemeDefinition, type ThemeColors, type ThemeEffects, type ChatBackground } from "@/lib/themes";

interface UIState {
  friendsOpen: boolean;
  groupOpen: boolean;
  groupSettingsOpen: boolean;
  activeGroupId: string | null;
  settingsOpen: boolean;
  forwardModalOpen: boolean;
  messageToForward: any | null; // using any for now, will cast to Message
  themeId: string;

  setFriendsOpen: (open: boolean) => void;
  setGroupOpen: (open: boolean) => void;
  setGroupSettingsOpen: (open: boolean, groupId?: string) => void;
  setSettingsOpen: (open: boolean) => void;
  openForwardModal: (message: any) => void;
  closeForwardModal: () => void;
  applyTheme: (themeId: string) => void;
  applyCustomTheme: (customTheme: { id: string; name: string; colors: Partial<ThemeColors>; effects?: Partial<ThemeEffects>; chatBg?: ChatBackground | null }) => void;
  getActiveTheme: () => ThemeDefinition;
}

export const useUIStore = create<UIState>((set, get) => ({
  friendsOpen: false,
  groupOpen: false,
  groupSettingsOpen: false,
  activeGroupId: null,
  settingsOpen: false,
  forwardModalOpen: false,
  messageToForward: null,
  themeId: "default",

  setFriendsOpen: (open) => set({ friendsOpen: open }),
  setGroupOpen: (open) => set({ groupOpen: open }),
  setGroupSettingsOpen: (open, groupId) => set({ groupSettingsOpen: open, activeGroupId: groupId || null }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  openForwardModal: (message) => set({ forwardModalOpen: true, messageToForward: message }),
  closeForwardModal: () => set({ forwardModalOpen: false, messageToForward: null }),

  applyTheme: (themeId: string) => {
    const theme = themes[themeId];
    if (!theme) return;
    set({ themeId });
    if (typeof window !== "undefined") {
      applyThemeToDOM(theme);
      localStorage.setItem("wispecho-theme", themeId);
    }
  },

  applyCustomTheme: (customTheme) => {
    const theme = buildCustomTheme(customTheme);
    const customId = `custom_${customTheme.id}`;
    set({ themeId: customId });
    if (typeof window !== "undefined") {
      applyThemeToDOM(theme);
      localStorage.setItem("wispecho-theme", customId);
      // Also store the custom theme data so it can be rehydrated from localStorage
      localStorage.setItem("wispecho-custom-theme-data", JSON.stringify(customTheme));
    }
  },

  getActiveTheme: () => {
    const { themeId } = get();
    if (themeId.startsWith("custom_")) {
      // Try to load custom theme data from localStorage
      try {
        const data = localStorage.getItem("wispecho-custom-theme-data");
        if (data) return buildCustomTheme(JSON.parse(data));
      } catch {}
    }
    return themes[themeId] || themes.default;
  },
}));
