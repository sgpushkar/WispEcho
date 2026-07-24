import { create } from "zustand";

interface UIState {
  friendsOpen: boolean;
  groupOpen: boolean;
  groupSettingsOpen: boolean;
  activeGroupId: string | null;
  settingsOpen: boolean;
  forwardModalOpen: boolean;
  messageToForward: any | null; // using any for now, will cast to Message
  theme: "light" | "dark";

  setFriendsOpen: (open: boolean) => void;
  setGroupOpen: (open: boolean) => void;
  setGroupSettingsOpen: (open: boolean, groupId?: string) => void;
  setSettingsOpen: (open: boolean) => void;
  openForwardModal: (message: any) => void;
  closeForwardModal: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIState>((set) => ({
  friendsOpen: false,
  groupOpen: false,
  groupSettingsOpen: false,
  activeGroupId: null,
  settingsOpen: false,
  forwardModalOpen: false,
  messageToForward: null,
  theme: "dark", // default theme

  setFriendsOpen: (open) => set({ friendsOpen: open }),
  setGroupOpen: (open) => set({ groupOpen: open }),
  setGroupSettingsOpen: (open, groupId) => set({ groupSettingsOpen: open, activeGroupId: groupId || null }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  openForwardModal: (message) => set({ forwardModalOpen: true, messageToForward: message }),
  closeForwardModal: () => set({ forwardModalOpen: false, messageToForward: null }),
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      if (theme === "light") {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }
    }
  },
}));
