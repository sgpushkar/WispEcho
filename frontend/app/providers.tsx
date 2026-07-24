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
  }, [setTheme]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
