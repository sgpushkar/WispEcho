"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChatStore } from "@/store/useChatStore";

export default function ChatPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  useSocketEvents();

  useEffect(() => {
    if (!accessToken) router.replace("/login");
  }, [accessToken, router]);

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
