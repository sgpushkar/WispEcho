"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHasHydrated } from "@/store/useAuthStore";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChatStore } from "@/store/useChatStore";

export default function ChatPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const hydrated = useHasHydrated();
  useSocketEvents();

  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/login");
  }, [hydrated, accessToken, router]);

  // Wait for zustand to rehydrate from localStorage before rendering
  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!accessToken) return null;

  return (
    <div className="app">
      {/* On mobile, show Sidebar if no active chat. On desktop, always show Sidebar. */}
      <div className={`h-full ${activeConversationId ? 'hidden md:block' : 'w-full md:w-auto'}`}>
        <Sidebar />
      </div>

      {/* On mobile, show ChatWindow if active chat. On desktop, show ChatWindow if active chat, otherwise placeholder. */}
      <div className={`h-full flex-1 ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        <ChatWindow />
      </div>
    </div>
  );
}
