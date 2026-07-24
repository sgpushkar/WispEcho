"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeft, User as UserIcon, Calendar, Circle } from "lucide-react";
import { format } from "date-fns";

function ProfileContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get("u") || "";
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      if (!username) return null;
      const res = await api.get(`/users/${username}`);
      return res.data.user;
    },
    retry: false,
    enabled: !!username,
  });

  if (!username) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#0a0a0a] gap-4 text-white">
        <h2 className="text-2xl font-bold">No User Specified</h2>
        <button
          onClick={() => router.back()}
          className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#0a0a0a] gap-4 text-white">
        <h2 className="text-2xl font-bold">User Not Found</h2>
        <p className="text-white/60">The user @{username} does not exist.</p>
        <button
          onClick={() => router.back()}
          className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  const user = data;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-white/5 bg-[#0a0a0a]/80 p-4 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 hover:bg-white/10 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <div className="mx-auto w-full max-w-3xl pb-12">
        {/* Banner */}
        <div className="relative h-48 w-full sm:h-64 bg-white/5">
          {user.bannerUrl ? (
            <img src={user.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ backgroundColor: user.accentColor || "#8b5cf6" }} />
          )}
        </div>

        {/* Profile Info */}
        <div className="relative px-4 sm:px-8">
          <div className="flex justify-between">
            <div className="-mt-16 sm:-mt-20 relative h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-[#0a0a0a] bg-[#1a1a1a] overflow-hidden flex items-center justify-center">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
              ) : (
                <UserIcon size={64} className="text-white/50" />
              )}
            </div>
            <div className="pt-4">
              {/* Could add action buttons here like 'Add Friend' or 'Message' in the future */}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{user.displayName}</h2>
              <p className="text-white/60">@{user.username}</p>
            </div>

            {user.bio && (
              <p className="whitespace-pre-wrap text-white/90">{user.bio}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-white/50">
              {user.status && (
                <div className="flex items-center gap-1.5">
                  <Circle size={14} className={user.isOnline ? "fill-green-500 text-green-500" : "fill-white/20 text-transparent"} />
                  <span>{user.status}</span>
                </div>
              )}
              {user.pronouns && (
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full">
                  <span>{user.pronouns}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>Joined {format(new Date(user.createdAt), "MMMM yyyy")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
