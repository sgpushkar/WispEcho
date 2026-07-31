"use client";

import { useEffect, useState } from "react";
import { Search, LogOut, Users, Plus, Settings, Pin, PinOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, Conversation } from "@/store/useChatStore";
import { useUIStore } from "@/store/useUIStore";
import { formatDistanceToNowStrict } from "date-fns";
import { FriendsModal } from "../friends/FriendsModal";
import { CreateGroupModal } from "./CreateGroupModal";
import { SettingsModal } from "./SettingsModal";
import { GroupSettingsModal } from "./GroupSettingsModal";
import { ForwardModal } from "./ForwardModal";
import Link from "next/link";
import { Avatar } from "../ui/Avatar";

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { conversations, setConversations, activeConversationId, setActiveConversation, onlineUsers } = useChatStore();
  
  const { friendsOpen, setFriendsOpen, groupOpen, setGroupOpen, settingsOpen, setSettingsOpen, theme } = useUIStore();
  const [query, setQuery] = useState("");

  const isNewUser = useAuthStore((s) => s.isNewUser);
  const setIsNewUser = useAuthStore((s) => s.setIsNewUser);

  useEffect(() => {
    if (isNewUser) {
      setSettingsOpen(true);
    }
  }, [isNewUser]);

  const handleSettingsClose = () => {
    setSettingsOpen(false);
    if (isNewUser) {
      setIsNewUser(false);
    }
  };

  const { data } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => (await api.get("/messages/conversations")).data.conversations as Conversation[],
  });

  useEffect(() => {
    if (data) {
      setConversations(data);
      // Preload messages for all conversations in the background
      data.forEach((conv) => {
        const existingMessages = useChatStore.getState().messages[conv.id];
        if (!existingMessages || existingMessages.length === 0) {
          api.get(`/messages/conversations/${conv.id}/messages`)
            .then((res) => {
              useChatStore.getState().setMessages(conv.id, res.data.messages);
            })
            .catch((err) => {
              console.error(`Failed to preload messages for conversation ${conv.id}:`, err);
            });
        }
      });
    }
  }, [data, setConversations]);

  const { data: requestsData } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: async () => (await api.get("/friends/requests")).data,
  });
  const incomingRequestsCount = requestsData?.incoming?.length || 0;

  const filtered = conversations
    .filter((c) => {
      const name = c.isGroup ? c.group?.name : c.otherUser?.displayName;
      return name?.toLowerCase().includes(query.toLowerCase());
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    });

  const togglePin = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    useChatStore.getState().togglePin(conversationId);
    try {
      await api.patch(`/messages/conversations/${conversationId}/pin`);
    } catch (err) {
      useChatStore.getState().togglePin(conversationId); // revert on failure
    }
  };

  return (
    <>
      <aside className="sidebar glass h-full w-full md:w-[300px]">
        {/* Header / Brand */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="WispEcho" className="h-8 w-auto rounded-[6px] brand-logo" />
            <span className="brand-name text-base font-bold">WispEcho</span>
          </div>
          {/* Desktop action buttons only */}
          <div className="hidden md:flex items-center gap-1">
            <button onClick={() => setFriendsOpen(true)} className="icon-btn relative" title="Friends">
              <Users size={16} />
              {incomingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0f0f11]">
                  {incomingRequestsCount > 9 ? "9+" : incomingRequestsCount}
                </span>
              )}
            </button>
            <button onClick={() => setGroupOpen(true)} className="icon-btn" title="New Group">
              <Plus size={16} />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="icon-btn" title="Settings">
              <Settings size={16} />
            </button>
            <button onClick={logout} className="icon-btn" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
          {/* Mobile: compact new chat + settings icon */}
          <div className="flex md:hidden items-center gap-1">
            <button onClick={() => setFriendsOpen(true)} className="icon-btn relative" title="Friends">
              <Users size={18} />
              {incomingRequestsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0f0f11]">
                  {incomingRequestsCount > 9 ? "9+" : incomingRequestsCount}
                </span>
              )}
            </button>
            <button onClick={() => setGroupOpen(true)} className="icon-btn" title="New Group">
              <Plus size={18} />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="icon-btn" title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search chats"
            className="w-full bg-transparent outline-none text-inherit placeholder-[var(--ink-faint)] text-[13px]"
          />
        </div>

        {/* Conversations List */}
        <div className="conv-list">
          {filtered.map((conv) => {
            const name = conv.isGroup ? conv.group?.name : conv.otherUser?.displayName;
            const avatar = conv.isGroup ? conv.group?.avatarUrl : conv.otherUser?.avatarUrl;
            const isOnline = conv.otherUser ? onlineUsers.has(conv.otherUser.id) : false;
            const active = conv.id === activeConversationId;
            
            const typingSet = useChatStore.getState().typingUsers[conv.id];
            const isTyping = typingSet && typingSet.size > 0;
            const hasUnread = false; // Mocked until backend supports unread counts

            return (
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`conv ${active ? "active" : ""}`}
              >
                <div className="relative shrink-0">
                  <Avatar src={avatar} name={name} className="h-10 w-10 rounded-[14px]" />
                  {isOnline && <span className="dot" />}
                </div>

                <div className="conv-meta">
                  <div className="conv-name">{name}</div>
                  <div className="conv-preview">
                    {isTyping ? (
                      <div className="flex items-center gap-1 h-[18px]">
                        <span className="text-[11px] text-accent font-medium mr-1">typing</span>
                        <div className="typing-dot bg-accent" />
                        <div className="typing-dot bg-accent" />
                        <div className="typing-dot bg-accent" />
                      </div>
                    ) : (
                      conv.lastMessage?.content || "say hey 👋"
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 relative group">
                  <div className="conv-time group-hover:opacity-0 transition-opacity">
                    {conv.lastMessage ? formatDistanceToNowStrict(new Date(conv.lastMessage.createdAt), { addSuffix: false }) : ""}
                  </div>
                  <button 
                    onClick={(e) => togglePin(e, conv.id)} 
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/50 hover:text-white"
                  >
                    {conv.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  {hasUnread && <div className="w-2 h-2 rounded-full bg-white mt-1" />}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Current User Card */}
        {user && (
          <div className="me-card mt-auto flex items-center justify-between">
            <Link href={`/profile?u=${user.username}`} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
              <div className="avatar avatar-font overflow-hidden">
                <Avatar src={user.avatarUrl} name={user.displayName} className="h-full w-full rounded-[14px] border-none" />
              </div>
              <div className="min-w-0">
                <div className="me-name truncate">{user.displayName}</div>
                <div className="me-handle truncate">@{user.username}</div>
              </div>
            </Link>
            {/* Logout only visible on mobile — on desktop it's in the header */}
            <button onClick={logout} className="icon-btn md:hidden ml-1 shrink-0" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      <FriendsModal isOpen={friendsOpen} onClose={() => setFriendsOpen(false)} />
      <CreateGroupModal isOpen={groupOpen} onClose={() => setGroupOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={handleSettingsClose} />
      <GroupSettingsModal />
      <ForwardModal />
    </>
  );
}
