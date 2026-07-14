"use client";

import { useEffect, useState } from "react";
import { Search, LogOut, Users, Plus, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, Conversation } from "@/store/useChatStore";
import { formatDistanceToNowStrict } from "date-fns";
import { FriendsModal } from "../friends/FriendsModal";
import { CreateGroupModal } from "./CreateGroupModal";
import { SettingsModal } from "./SettingsModal";

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { conversations, setConversations, activeConversationId, setActiveConversation, onlineUsers } = useChatStore();
  
  const [query, setQuery] = useState("");
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    if (data) setConversations(data);
  }, [data]);

  const filtered = conversations.filter((c) => {
    const name = c.isGroup ? c.group?.name : c.otherUser?.displayName;
    return name?.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <>
      <aside className="sidebar glass h-full w-full md:w-[300px]">
        {/* Header / Brand */}
        <div className="flex items-center justify-between pb-2">
          <div className="brand">
            <div className="brand-mark"></div>
            <span className="brand-name">WispEcho</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setFriendsOpen(true)} className="icon-btn" title="Friends">
              <Users size={16} />
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
        </div>

        {/* Search */}
        <div className="search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search chats"
            className="w-full bg-transparent outline-none placeholder-white/30 text-[13px]"
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
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`conv ${active ? "active" : ""}`}
              >
                <div className="avatar">
                  {avatar ? (
                    <img src={avatar} className="h-full w-full object-cover rounded-[14px]" alt="" />
                  ) : (
                    name?.[0]?.toUpperCase()
                  )}
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

                <div className="flex flex-col items-end gap-1">
                  <div className="conv-time">
                    {conv.lastMessage ? formatDistanceToNowStrict(new Date(conv.lastMessage.createdAt), { addSuffix: false }) : ""}
                  </div>
                  {hasUnread && <div className="w-2 h-2 rounded-full bg-white mt-1" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current User Card */}
        {user && (
          <div className="me-card mt-auto">
            <div className="avatar avatar-font">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} className="h-full w-full object-cover rounded-[14px]" alt="" />
              ) : (
                user.displayName[0]?.toUpperCase()
              )}
            </div>
            <div>
              <div className="me-name">{user.displayName}</div>
              <div className="me-handle">@{user.username}</div>
            </div>
          </div>
        )}
      </aside>

      <FriendsModal isOpen={friendsOpen} onClose={() => setFriendsOpen(false)} />
      <CreateGroupModal isOpen={groupOpen} onClose={() => setGroupOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={handleSettingsClose} />
    </>
  );
}
