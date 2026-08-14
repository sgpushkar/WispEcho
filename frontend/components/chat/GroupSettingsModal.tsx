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

  const [activeTab, setActiveTab] = useState<"details" | "members">("details");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSharedMedia, setShowSharedMedia] = useState(false);

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
        className="glass relative flex h-[600px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10"
      >
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={18} /> Group Settings
          </h2>
          <button onClick={() => setGroupSettingsOpen(false)} className="rounded-full p-1 text-white/40 hover:bg-white/5 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === "details" ? "border-b-2 border-white text-white" : "text-white/40 hover:text-white/80"}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === "members" ? "border-b-2 border-white text-white" : "text-white/40 hover:text-white/80"}`}
          >
            Members
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading && <div className="text-center text-white/40 py-8">Loading...</div>}
          
          {!isLoading && activeTab === "details" && (
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <Avatar src={avatarUrl} name={name} className="h-24 w-24 rounded-[20px] text-2xl font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/60">Group Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Group Name"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 text-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/60">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  placeholder="What's this group about?"
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 text-white resize-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/60">Avatar URL</label>
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 text-white disabled:opacity-50"
                />
              </div>

              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => setShowSharedMedia(true)}
                  className="w-full flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition"
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-white/60" />
                    Shared Media
                  </span>
                  <span className="text-white/40">&rarr;</span>
                </button>
              </div>
            </div>
          )}

          {!isLoading && activeTab === "members" && (
            <div className="space-y-6">
              {/* Add Member Section */}
              {canEdit && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white/60">Add New Member</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-2.5 text-white/40" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm outline-none placeholder:text-white/30 text-white"
                    />
                  </div>
                  {searchResults && searchResults.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2 space-y-1">
                      {searchResults.map((su: any) => {
                        const isAlreadyMember = groupData?.members?.some((m: any) => m.userId === su.id);
                        return (
                          <div key={su.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition">
                            <div className="flex items-center gap-3">
                              <Avatar src={su.avatarUrl} name={su.displayName} className="h-8 w-8 rounded-full text-[10px] border-none" />
                              <div className="text-sm">
                                <p className="font-medium text-white">{su.displayName}</p>
                                <p className="text-xs text-white/40">@{su.username}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => inviteMember.mutate(su.id)}
                              disabled={isAlreadyMember || inviteMember.isPending}
                              className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
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
                <label className="text-sm font-medium text-white/60">Current Members ({groupData?.members?.length || 0})</label>
                <div className="space-y-2">
                  {groupData?.members?.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                      <Link
                        href={`/profile?u=${member.user.username}`}
                        onClick={() => {
                          setGroupSettingsOpen(false);
                        }}
                        className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer"
                      >
                        <Avatar src={member.user.avatarUrl} name={member.user.displayName} className="h-10 w-10 rounded-full text-xs border-none" />
                        <div className="text-sm">
                          <p className="font-medium text-white">{member.user.displayName}</p>
                          <p className="text-xs text-white/40">@{member.user.username}</p>
                        </div>
                      </Link>
                      <div className="text-[10px] font-medium tracking-wider uppercase px-2 py-1 rounded bg-white/10 text-white/60">
                        {member.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 p-4 space-y-2 shrink-0">
          {/* Save Changes — details tab + editor */}
          {activeTab === "details" && canEdit && (
            <button
              onClick={() => updateGroup.mutate()}
              disabled={!name || updateGroup.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/10 px-4 py-2 font-medium text-white hover:bg-white/20 transition disabled:opacity-50"
            >
              <Save size={16} /> {updateGroup.isPending ? "Saving..." : "Save Changes"}
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
