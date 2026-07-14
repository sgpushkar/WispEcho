import { create } from "zustand";

interface UIState {
  friendsOpen: boolean;
  groupOpen: boolean;
  settingsOpen: boolean;
  forwardModalOpen: boolean;
  messageToForward: any | null; // using any for now, will cast to Message

  setFriendsOpen: (open: boolean) => void;
  setGroupOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  openForwardModal: (message: any) => void;
  closeForwardModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  friendsOpen: false,
  groupOpen: false,
  settingsOpen: false,
  forwardModalOpen: false,
  messageToForward: null,

  setFriendsOpen: (open) => set({ friendsOpen: open }),
  setGroupOpen: (open) => set({ groupOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  openForwardModal: (message) => set({ forwardModalOpen: true, messageToForward: message }),
  closeForwardModal: () => set({ forwardModalOpen: false, messageToForward: null }),
}));
