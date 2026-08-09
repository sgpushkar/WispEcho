"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { themes, buildCustomTheme, applyThemeToDOM } from "@/lib/themes";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }));
  const applyTheme = useUIStore((s) => s.applyTheme);
  const applyCustomTheme = useUIStore((s) => s.applyCustomTheme);

  useEffect(() => {
    // 1. Check if user has a server-synced themeId
    const user = useAuthStore.getState().user;
    const serverThemeId = user?.themeId;

    // 2. Fall back to localStorage
    const localThemeId = localStorage.getItem("wispecho-theme") || "default";
    const themeId = serverThemeId || localThemeId;

    // 3. Apply theme
    if (themeId.startsWith("custom_")) {
      // Custom theme — try to load from localStorage
      try {
        const data = localStorage.getItem("wispecho-custom-theme-data");
        if (data) {
          applyCustomTheme(JSON.parse(data));
        } else {
          applyTheme("default");
        }
      } catch {
        applyTheme("default");
      }
    } else if (themes[themeId]) {
      applyTheme(themeId);
    } else {
      applyTheme("default");
    }

    // Migrate legacy "theme" localStorage key
    const legacyTheme = localStorage.getItem("theme");
    if (legacyTheme && !localStorage.getItem("wispecho-theme")) {
      if (legacyTheme === "light") {
        applyTheme("light");
      } else {
        applyTheme("default");
      }
      localStorage.removeItem("theme");
    }

    // Capacitor native platform detection
    if (typeof window !== "undefined") {
      import("@capacitor/core").then(({ Capacitor }) => {
        if (Capacitor.isNativePlatform()) {
          document.body.classList.add("native-app");
        }
      });

      const isCapacitor = (window as any).Capacitor;
      if (isCapacitor) {
        import("@capacitor/app").then(({ App }) => {
          App.addListener("backButton", ({ canGoBack }) => {
            const uiState = useUIStore.getState();
            const chatState = useChatStore.getState();

            // 1. If any modal is open, close it
            if (uiState.friendsOpen) {
              uiState.setFriendsOpen(false);
            } else if (uiState.groupOpen) {
              uiState.setGroupOpen(false);
            } else if (uiState.groupSettingsOpen) {
              uiState.setGroupSettingsOpen(false);
            } else if (uiState.settingsOpen) {
              uiState.setSettingsOpen(false);
            } else if (uiState.forwardModalOpen) {
              uiState.closeForwardModal();
            }
            // 2. If there is an active conversation, close it (go back to list on mobile)
            else if (chatState.activeConversationId) {
              chatState.setActiveConversation(null);
            }
            // 3. Otherwise, check path and history
            else {
              const currentPath = window.location.pathname;
              if (currentPath === "/chat" || currentPath === "/") {
                if (canGoBack) {
                  window.history.back();
                } else {
                  App.exitApp();
                }
              } else if (canGoBack) {
                window.history.back();
              } else {
                App.exitApp();
              }
            }
          });
        });
      }
    }
  }, [applyTheme, applyCustomTheme]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
