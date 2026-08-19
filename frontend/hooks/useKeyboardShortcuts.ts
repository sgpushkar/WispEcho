import { useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";

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
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsOpen, setSettingsOpen]);
}
