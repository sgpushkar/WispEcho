"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useChatStore } from "@/store/useChatStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }));
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const localTheme = (localStorage.getItem("theme") as "light" | "dark") || "dark";
    setTheme(localTheme);

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
  }, [setTheme]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
