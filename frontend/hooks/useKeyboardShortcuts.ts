import { useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useChatStore } from "@/store/useChatStore";

export function useKeyboardShortcuts() {
  const { setSettingsOpen, settingsOpen } = useUIStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl + / or Cmd + / to focus composer
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        const composer = document.querySelector(".composer textarea") as HTMLTextAreaElement;
        composer?.focus();
      }

      // Ctrl + Shift + L to toggle settings
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setSettingsOpen(!settingsOpen);
      }

      // Escape to clear reply/editing
      if (e.key === "Escape") {
        // Clear reply/edit states
        // Since the state is in useChatStore or local component, let's check
        // If there's active state in a store we can clean it, but usually replyToMessage is locally managed in ChatWindow.
        // Wait, we can dispatch a custom event or let the components handle their own Esc listener.
        // Actually, Esc is already handled in CommandPalette.
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsOpen, setSettingsOpen]);
}
