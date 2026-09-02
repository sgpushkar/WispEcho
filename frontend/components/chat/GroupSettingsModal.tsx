"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Users, Search, Save, Edit3, LogOut, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { useChatStore } from "@/store/useChatStore";
import Link from "next/link";
import { Avatar } from "../ui/Avatar";
import { SharedMediaModal } from "./SharedMediaModal";
import { Image as ImageIcon } from "lucide-react";
import { Portal } from "../ui/Portal";

export function GroupSettingsModal() {
  const { groupSettingsOpen, setGroupSettingsOpen, activeGroupId } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"details" | "members" | "settings">("details");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSharedMedia, setShowSharedMedia] = useState(false);
  const [isAnnouncementOnly, setIsAnnouncementOnly] = useState(false);
  const [requireJoinApproval, setRequireJoinApproval] = useState(false);
  const [maxMembers, setMaxMembers] = useState(256);
  const [joinLink, setJoinLink] = useState("");

  const { data: groupData, isLoading } = useQuery({
    queryKey: ["group", activeGroupId],
    queryFn: async () => {
      if (!activeGroupId) return null;
      const res = await api.get(`/groups/${activeGroupId}`);
      return res.data.group;
    },
    enabled: !!activeGroupId && groupSettingsOpen,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["searchUsers", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await api.get(`/users/search?q=${searchQuery}`);
      return res.data.users;
    },
    enabled: !!searchQuery.trim(),
  });

  useEffect(() => {
    if (groupData) {
      setName(groupData.name || "");
      setDescription(groupData.description || "");
      setAvatarUrl(groupData.avatarUrl || "");
      setIsAnnouncementOnly(!!groupData.isAnnouncementOnly);
      setRequireJoinApproval(!!groupData.requireJoinApproval);
      setMaxMembers(groupData.maxMembers || 256);
      if (groupData.joinCode) {
        setJoinLink(`${window.location.origin}/join/${groupData.joinCode}`);
      }
    }
  }, [groupData]);

  const updateGroup = useMutation({
    mutationFn: async () => api.patch(`/groups/${activeGroupId}`, { name, description, avatarUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", activeGroupId] });
      alert("Group details updated");
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error updating group"),
  });

  const updateSettings = useMutation({
    mutationFn: async () => api.patch(`/groups/${activeGroupId}/settings`, { isAnnouncementOnly, requireJoinApproval, maxMembers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", activeGroupId] });
      alert("Settings updated");
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error updating settings"),
  });

  const generateJoinLink = useMutation({
    mutationFn: async () => api.post(`/groups/${activeGroupId}/join-link`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["group", activeGroupId] });
      setJoinLink(res.data.link);
      alert("Join link generated");
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error generating link"),
  });

  const inviteMember = useMutation({
    mutationFn: async (userId: string) => api.post(`/groups/${activeGroupId}/invite`, { userIds: [userId] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", activeGroupId] });
      setSearchQuery("");
      alert("Member added!");
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error adding member"),
  });

  const leaveGroup = useMutation({
    mutationFn: async () => api.post(`/groups/${activeGroupId}/leave`),
    onSuccess: () => {
      setGroupSettingsOpen(false);
      const { activeConversationId, setActiveConversation } = useChatStore.getState();
      if (activeConversationId === groupData?.conversationId) {
        setActiveConversation(null);
      }
      // Socket group:memberLeft will remove conversation from store
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error leaving group"),
  });

  const deleteGroup = useMutation({
    mutationFn: async () => api.delete(`/groups/${activeGroupId}`),
    onSuccess: () => {
      setGroupSettingsOpen(false);
      const { activeConversationId, setActiveConversation } = useChatStore.getState();
      if (activeConversationId === groupData?.conversationId) {
        setActiveConversation(null);
      }
      // Socket group:deleted will remove conversation from store
    },
    onError: (err: any) => alert(err.response?.data?.error || "Error deleting group"),
  });

  if (!groupSettingsOpen || !activeGroupId) return null;

  const myMemberInfo = groupData?.members?.find((m: any) => m.userId === user?.id);
  const canEdit = myMemberInfo && ["OWNER", "ADMIN"].includes(myMemberInfo.role);

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass relative flex h-[600px] max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--glass-border-strong)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--ink)]">
            <Users size={18} /> Group Settings
          </h2>
          <button onClick={() => setGroupSettingsOpen(false)} className="rounded-full p-1 text-[var(--ink-faint)] hover:bg-[var(--hover-bg)] hover:text-[var(--ink)] transition">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--glass-border)]">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === "details" ? "border-b-2 border-[var(--ink)] text-[var(--ink)] font-semibold" : "text-[var(--ink-faint)] hover:text-[var(--ink)]"}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === "members" ? "border-b-2 border-[var(--ink)] text-[var(--ink)] font-semibold" : "text-[var(--ink-faint)] hover:text-[var(--ink)]"}`}
          >
            Members
          </button>
          {canEdit && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 py-3 text-sm font-medium transition ${activeTab === "settings" ? "border-b-2 border-[var(--ink)] text-[var(--ink)] font-semibold" : "text-[var(--ink-faint)] hover:text-[var(--ink)]"}`}
            >
              Settings
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading && <div className="text-center text-white/40 py-8">Loading...</div>}
          
          {!isLoading && activeTab === "details" && (
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <Avatar src={avatarUrl} name={name} className="h-24 w-24 rounded-[20px] text-2xl font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ink-dim)]">Group Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Group Name"
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--hover-bg)] px-3 py-2 text-sm outline-none placeholder:text-[var(--ink-faint)] text-[var(--ink)] disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ink-dim)]">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  placeholder="What's this group about?"
                  rows={3}
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--hover-bg)] px-3 py-2 text-sm outline-none placeholder:text-[var(--ink-faint)] text-[var(--ink)] resize-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ink-dim)]">Avatar URL</label>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--hover-bg)] px-3 py-2 text-sm outline-none placeholder:text-[var(--ink-faint)] text-[var(--ink)] disabled:opacity-50"
                />
              </div>

              <div className="pt-2 border-t border-[var(--glass-border)]">
                <button
                  onClick={() => setShowSharedMedia(true)}
                  className="w-full flex items-center justify-between rounded-xl bg-[var(--hover-bg)] border border-[var(--glass-border)] px-4 py-3 text-sm font-medium text-[var(--ink)] hover:bg-[var(--active-bg)] transition"
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-[var(--ink-dim)]" />
                    Shared Media
                  </span>
                  <span className="text-[var(--ink-faint)]">&rarr;</span>
                </button>
              </div>
            </div>
          )}

          {!isLoading && activeTab === "members" && (
            <div className="space-y-6">
              {/* Add Member (Admin Only) */}
              {canEdit && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-[var(--ink-dim)]">Add New Member</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-2.5 text-[var(--ink-faint)]" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--hover-bg)] pl-9 pr-3 py-2 text-sm outline-none placeholder:text-[var(--ink-faint)] text-[var(--ink)]"
                    />
                  </div>
                  {searchResults && searchResults.length > 0 && (
                    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--hover-bg)] p-2 space-y-1">
                      {searchResults.map((su: any) => {
                        const isAlreadyMember = groupData?.members?.some((m: any) => m.userId === su.id);
                        return (
                          <div key={su.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--active-bg)] transition">
                            <div className="flex items-center gap-3">
                              <Avatar src={su.avatarUrl} name={su.displayName} className="h-8 w-8 rounded-full text-[10px] border-none" />
                              <div className="text-sm">
                                <p className="font-medium text-[var(--ink)]">{su.displayName}</p>
                                <p className="text-xs text-[var(--ink-faint)]">@{su.username}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => inviteMember.mutate(su.id)}
                              disabled={isAlreadyMember || inviteMember.isPending}
                              className="px-3 py-1 text-xs font-medium rounded-full bg-accent text-white hover:bg-accent/90 transition disabled:opacity-50"
                            >
                              {isAlreadyMember ? "Added" : "Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Member List */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-[var(--ink-dim)]">Current Members ({groupData?.members?.length || 0})</label>
                <div className="space-y-2">
                  {groupData?.members?.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-xl bg-[var(--hover-bg)] border border-[var(--glass-border)]">
                      <Link
                        href={`/profile?u=${member.user.username}`}
                        onClick={() => {
                          setGroupSettingsOpen(false);
                        }}
                        className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer"
                      >
                        <Avatar src={member.user.avatarUrl} name={member.user.displayName} className="h-10 w-10 rounded-full text-xs border-none" />
                        <div className="text-sm">
                          <p className="font-medium text-[var(--ink)]">{member.user.displayName}</p>
                          <p className="text-xs text-[var(--ink-faint)]">@{member.user.username}</p>
                        </div>
                      </Link>
                      <div className="text-[10px] font-medium tracking-wider uppercase px-2 py-1 rounded bg-[var(--active-bg)] text-[var(--ink-dim)] border border-[var(--glass-border)]">
                        {member.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isLoading && activeTab === "settings" && canEdit && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ink-dim)]">Invite Link</label>
                <div className="flex gap-2">
                  <input
                    value={joinLink}
                    readOnly
                    placeholder="No link generated"
                    className="flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--hover-bg)] px-3 py-2 text-sm outline-none placeholder:text-[var(--ink-faint)] text-[var(--ink)] disabled:opacity-50"
                  />
                  <button 
                    onClick={() => generateJoinLink.mutate()} 
                    disabled={generateJoinLink.isPending}
                    className="bg-[var(--hover-bg)] border border-[var(--glass-border)] px-3 py-2 rounded-xl text-sm font-medium text-[var(--ink)] hover:bg-[var(--active-bg)] transition disabled:opacity-50"
                  >
                    {joinLink ? "Rotate" : "Generate"}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${requireJoinApproval ? 'bg-accent' : 'bg-[var(--hover-bg)] border border-[var(--glass-border)]'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${requireJoinApproval ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--ink)] group-hover:opacity-90">Require Join Approval</div>
                    <div className="text-xs text-[var(--ink-dim)]">New members must be approved by admins</div>
                  </div>
                  <input type="checkbox" className="hidden" checked={requireJoinApproval} onChange={(e) => setRequireJoinApproval(e.target.checked)} />
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isAnnouncementOnly ? 'bg-accent' : 'bg-[var(--hover-bg)] border border-[var(--glass-border)]'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAnnouncementOnly ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--ink)] group-hover:opacity-90">Announcement Mode</div>
                    <div className="text-xs text-[var(--ink-dim)]">Only admins can send messages</div>
                  </div>
                  <input type="checkbox" className="hidden" checked={isAnnouncementOnly} onChange={(e) => setIsAnnouncementOnly(e.target.checked)} />
                </label>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--ink-dim)]">Max Members ({maxMembers})</label>
                  <input
                    type="range"
                    min="2"
                    max="10000"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--glass-border)] p-4 space-y-2 shrink-0">
          {/* Save Changes — details tab + editor */}
          {activeTab === "details" && canEdit && (
            <button
              onClick={() => updateGroup.mutate()}
              disabled={!name || updateGroup.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-white px-4 py-2 font-medium hover:bg-accent/90 transition disabled:opacity-50"
            >
              <Save size={16} /> {updateGroup.isPending ? "Saving..." : "Save Details"}
            </button>
          )}

          {/* Save Settings */}
          {activeTab === "settings" && canEdit && (
            <button
              onClick={() => updateSettings.mutate()}
              disabled={updateSettings.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-white px-4 py-2 font-medium hover:bg-accent/90 transition disabled:opacity-50"
            >
              <Save size={16} /> {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </button>
          )}

          {/* Danger zone */}
          {myMemberInfo && myMemberInfo.role !== "OWNER" && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to leave this group?")) leaveGroup.mutate();
              }}
              disabled={leaveGroup.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              <LogOut size={16} /> {leaveGroup.isPending ? "Leaving..." : "Leave Group"}
            </button>
          )}

          {myMemberInfo && myMemberInfo.role === "OWNER" && (
            <button
              onClick={() => {
                if (confirm("Delete this group permanently? This cannot be undone.")) deleteGroup.mutate();
              }}
              disabled={deleteGroup.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              <Trash2 size={16} /> {deleteGroup.isPending ? "Deleting..." : "Delete Group"}
            </button>
          )}
        </div>
      </motion.div>
      
      {showSharedMedia && groupData?.conversationId && (
        <SharedMediaModal 
          conversationId={groupData.conversationId} 
          onClose={() => setShowSharedMedia(false)} 
        />
      )}
      </div>
    </Portal>
  );
}
