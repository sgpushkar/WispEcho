"use client";

import { useEffect, useState, useRef, memo } from "react";
import { Search, LogOut, Users, Plus, Settings, Pin, PinOff, Bell, Bookmark, Archive, Star, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, Conversation, useChatHasHydrated } from "@/store/useChatStore";
import { useUIStore } from "@/store/useUIStore";
import { formatDistanceToNowStrict } from "date-fns";
import { FriendsModal } from "../friends/FriendsModal";
import { CreateGroupModal } from "./CreateGroupModal";
import { SettingsModal } from "./SettingsModal";
import { GroupSettingsModal } from "./GroupSettingsModal";
import { ForwardModal } from "./ForwardModal";
import { NotificationCenter } from "./NotificationCenter";
import { SavedMessagesModal } from "./SavedMessagesModal";
import Link from "next/link";
import { Avatar } from "../ui/Avatar";

type FilterTab = "all" | "favorites" | "archived";

interface ContextMenuState {
  conversationId: string;
  x: number;
  y: number;
}

const ConversationItem = memo(({ 
  conv, 
  active, 
  isOnline, 
  onClick, 
  onContextMenu, 
  onTogglePin, 
  onOpenContextMenu 
}: {
  conv: Conversation;
  active: boolean;
  isOnline: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onTogglePin: (e: React.MouseEvent, id: string) => void;
  onOpenContextMenu: (id: string) => void;
}) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const typingUsers = useChatStore((s) => s.typingUsers[conv.id]);
  const isTyping = typingUsers && Array.from(typingUsers).some(id => id !== currentUserId);
  const hasUnread = conv.lastMessage
    ? conv.lastMessage.senderId !== currentUserId &&
      conv.lastMessage.status !== "read" &&
      !conv.lastMessage.viewedByIds?.includes(currentUserId || "")
    : false;
  const name = conv.isGroup ? conv.group?.name : conv.otherUser?.displayName;
  const avatar = conv.isGroup ? conv.group?.avatarUrl : conv.otherUser?.avatarUrl;

  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => onContextMenu(e, conv.id)}
      className={`conv ${active ? "active" : ""} ${conv.isFavorite ? "ring-1 ring-yellow-400/20" : ""}`}
    >
      <div className="relative shrink-0">
        <Avatar src={avatar} name={name} className="h-10 w-10 rounded-[14px]" />
        {isOnline && <span className="dot" />}
        {conv.isFavorite && (
          <span className="absolute -top-1 -right-1 text-yellow-400 text-[8px]">★</span>
        )}
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

      <div className="flex flex-col items-end gap-1 relative group shrink-0">
        <div className="conv-time group-hover:opacity-0 transition-opacity">
          {conv.lastMessage ? formatDistanceToNowStrict(new Date(conv.lastMessage.createdAt), { addSuffix: false }) : ""}
        </div>
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          <button
            onClick={(e) => onTogglePin(e, conv.id)}
            className="text-white/50 hover:text-white p-0.5"
            title={conv.isPinned ? "Unpin" : "Pin"}
          >
            {conv.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenContextMenu(conv.id); }}
            className="text-white/50 hover:text-white p-0.5"
            title="More options"
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
        {hasUnread && <div className="w-2 h-2 rounded-full bg-white mt-1" />}
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.conv.id === next.conv.id &&
    prev.active === next.active &&
    prev.isOnline === next.isOnline &&
    prev.conv.isPinned === next.conv.isPinned &&
    prev.conv.isFavorite === next.conv.isFavorite &&
    prev.conv.lastMessage?.id === next.conv.lastMessage?.id &&
    prev.conv.lastMessage?.content === next.conv.lastMessage?.content &&
    prev.conv.lastMessage?.status === next.conv.lastMessage?.status &&
    prev.conv.lastMessage?.viewedByIds?.length === next.conv.lastMessage?.viewedByIds?.length;
});

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { conversations, setConversations, activeConversationId, setActiveConversation, onlineUsers, togglePin, toggleArchive, toggleFavorite } = useChatStore();
  const queryClient = useQueryClient();

  const { friendsOpen, setFriendsOpen, groupOpen, setGroupOpen, settingsOpen, setSettingsOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [notifOpen, setNotifOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const isClient = useChatHasHydrated();

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

  // Close context menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    if (contextMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  const { data } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => (await api.get("/messages/conversations")).data.conversations as Conversation[],
  });

  useEffect(() => {
    if (data) {
      setConversations(data);
    }
  }, [data, setConversations]);

  const { data: requestsData } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: async () => (await api.get("/friends/requests")).data,
  });
  const incomingRequestsCount = requestsData?.incoming?.length || 0;

  // Notification unread badge
  const { data: notifData } = useQuery({
    queryKey: ["inbox-notifications"],
    queryFn: async () => (await api.get("/inbox")).data as { notifications: any[]; unreadCount: number },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadNotifCount = notifData?.unreadCount || 0;

  // Archive / Favorite mutations (optimistic)
  const archiveMutation = useMutation({
    mutationFn: async (conversationId: string) =>
      api.patch(`/messages/conversations/${conversationId}/archive`),
    onMutate: (conversationId) => {
      toggleArchive(conversationId);
    },
    onError: (_err, conversationId) => {
      toggleArchive(conversationId); // revert
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async (conversationId: string) =>
      api.patch(`/messages/conversations/${conversationId}/favorite`),
    onMutate: (conversationId) => {
      toggleFavorite(conversationId);
    },
    onError: (_err, conversationId) => {
      toggleFavorite(conversationId); // revert
    },
  });

  const handleTogglePin = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    togglePin(conversationId);
    try {
      await api.patch(`/messages/conversations/${conversationId}/pin`);
    } catch {
      togglePin(conversationId); // revert on failure
    }
  };

  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ conversationId, x: e.clientX, y: e.clientY });
  };

  // Filter conversations based on tab
  const displayConversations = isClient ? conversations : [];
  const filtered = displayConversations
    .filter((c) => {
      if (filterTab === "favorites") return c.isFavorite;
      if (filterTab === "archived") return c.isArchived;
      return !c.isArchived; // "all" hides archived
    })
    .filter((c) => {
      const name = c.isGroup ? c.group?.name : c.otherUser?.displayName;
      return name?.toLowerCase().includes(query.toLowerCase());
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    });

  const tabClass = (tab: FilterTab) =>
    `px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
      filterTab === tab
        ? "bg-white/15 text-white"
        : "text-white/40 hover:text-white/70"
    }`;

  const contextConv = contextMenu
    ? conversations.find((c) => c.id === contextMenu.conversationId)
    : null;

  return (
    <>
      <aside className="sidebar glass h-full w-full md:w-[300px]">
        {/* Header / Brand */}
        <div className="flex items-center justify-between pb-1 relative z-[9999]">
          <div className="flex items-center gap-2">
            <img src="/logo-dark.png" alt="WispEcho" className="h-8 w-auto rounded-[6px] logo-dark" />
            <img src="/logo-light.png" alt="WispEcho" className="h-8 w-auto rounded-[6px] logo-light" />
            <span className="brand-name text-base font-bold">WispEcho</span>
          </div>
          {/* Desktop action buttons */}
          <div className="hidden md:flex items-center gap-1 relative z-[9999]">
            {/* Notification Bell */}
            <div className="relative z-[9999]" ref={notifRef}>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setNotifOpen((v) => !v)}
                className="icon-btn relative z-[9999]"
                title="Notifications"
              >
                <Bell size={16} />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0f0f11] z-[9999]">
                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                  </span>
                )}
              </button>
              <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            <button onClick={() => setFriendsOpen(true)} className="icon-btn relative z-[9999]" title="Friends">
              <Users size={16} />
              {incomingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0f0f11] z-[9999]">
                  {incomingRequestsCount > 9 ? "9+" : incomingRequestsCount}
                </span>
              )}
            </button>
            <button onClick={() => setGroupOpen(true)} className="icon-btn relative z-[9999]" title="New Group">
              <Plus size={16} />
            </button>
          </div>
          {/* Mobile: compact icons */}
          <div className="flex md:hidden items-center gap-1 relative z-[9999]">
            <div className="relative z-[9999]">
              <button 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setNotifOpen((v) => !v)} 
                className="icon-btn relative z-[9999]" 
                title="Notifications"
              >
                <Bell size={18} />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0f0f11] z-[9999]">
                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                  </span>
                )}
              </button>
              <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
            <button onClick={() => setFriendsOpen(true)} className="icon-btn relative z-[9999]" title="Friends">
              <Users size={18} />
              {incomingRequestsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0f0f11] z-[9999]">
                  {incomingRequestsCount > 9 ? "9+" : incomingRequestsCount}
                </span>
              )}
            </button>
            <button onClick={() => setGroupOpen(true)} className="icon-btn relative z-[9999]" title="New Group">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search relative z-0">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search chats"
            className="w-full bg-transparent outline-none text-inherit placeholder-[var(--ink-faint)] text-[13px]"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-1 pb-1 relative z-0">
          <button className={tabClass("all")} onClick={() => setFilterTab("all")}>
            All
          </button>
          <button className={tabClass("favorites")} onClick={() => setFilterTab("favorites")}>
            <span className="flex items-center gap-1"><Star size={10} /> Favorites</span>
          </button>
          <button className={tabClass("archived")} onClick={() => setFilterTab("archived")}>
            <span className="flex items-center gap-1"><Archive size={10} /> Archived</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="conv-list relative z-0">
          {filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeConversationId}
              isOnline={conv.otherUser ? onlineUsers.has(conv.otherUser.id) : false}
              onClick={() => setActiveConversation(conv.id)}
              onContextMenu={handleContextMenu}
              onTogglePin={handleTogglePin}
              onOpenContextMenu={(id) => setContextMenu({ conversationId: id, x: 0, y: 0 })}
            />
          ))}

          {filtered.length === 0 && (
            <div className="text-center text-white/30 text-[12px] py-8 px-4">
              {filterTab === "favorites" ? "No favourite chats yet" :
               filterTab === "archived" ? "No archived chats" :
               "No conversations yet"}
            </div>
          )}
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
            <div className="flex items-center shrink-0">
              <button onClick={() => setSavedOpen(true)} className="icon-btn" title="Saved Messages">
                <Bookmark size={16} />
              </button>
              <button onClick={() => setSettingsOpen(true)} className="icon-btn" title="Settings">
                <Settings size={16} />
              </button>
              <button 
                onClick={async () => {
                  try {
                    await api.post("/auth/logout", { refreshToken: useAuthStore.getState().refreshToken });
                  } catch(e) {
                    console.error("Logout error", e);
                  }
                  logout();
                }} 
                className="icon-btn" 
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && contextConv && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[200] glass-strong border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 min-w-[160px]"
            style={{
              left: contextMenu.x > 0 ? Math.min(contextMenu.x, window.innerWidth - 180) : 160,
              top: contextMenu.y > 0 ? Math.min(contextMenu.y, window.innerHeight - 120) : 80,
            }}
          >
            <button
              onClick={() => {
                favoriteMutation.mutate(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/80 hover:bg-white/5 hover:text-white transition"
            >
              <Star size={14} className={contextConv.isFavorite ? "text-yellow-400" : "text-white/40"} />
              {contextConv.isFavorite ? "Unfavorite" : "Favorite"}
            </button>
            <button
              onClick={() => {
                archiveMutation.mutate(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/80 hover:bg-white/5 hover:text-white transition"
            >
              <Archive size={14} className={contextConv.isArchived ? "text-blue-400" : "text-white/40"} />
              {contextConv.isArchived ? "Unarchive" : "Archive"}
            </button>
            <button
              onClick={(e) => {
                handleTogglePin(e, contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/80 hover:bg-white/5 hover:text-white transition"
            >
              {contextConv.isPinned ? <PinOff size={14} className="text-white/40" /> : <Pin size={14} className="text-white/40" />}
              {contextConv.isPinned ? "Unpin" : "Pin"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <FriendsModal isOpen={friendsOpen} onClose={() => setFriendsOpen(false)} />
      <CreateGroupModal isOpen={groupOpen} onClose={() => setGroupOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={handleSettingsClose} />
      <GroupSettingsModal />
      <ForwardModal />
      <SavedMessagesModal isOpen={savedOpen} onClose={() => setSavedOpen(false)} />
    </>
  );
}
