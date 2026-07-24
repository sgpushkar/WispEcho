"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }));
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const localTheme = (localStorage.getItem("theme") as "light" | "dark") || "dark";
    setTheme(localTheme);

    if (typeof window !== "undefined") {
      const isCapacitor = (window as any).Capacitor;
      if (isCapacitor) {
        import("@capacitor/app").then(({ App }) => {
          App.addListener("backButton", ({ canGoBack }) => {
            const currentPath = window.location.pathname;
            if (currentPath === "/chat" || currentPath === "/") {
              App.exitApp();
            } else if (canGoBack) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
        });
      }
    }
  }, [setTheme]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
