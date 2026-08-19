"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore, useHasHydrated } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { motion } from "framer-motion";
import { Users, Clock, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JoinGroupClient() {
  const params = useParams();
  const joinCode = params?.joinCode as string;
  const router = useRouter();
  const hydrated = useHasHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    status: "JOINED" | "PENDING_APPROVAL";
    group: any;
    conversationId?: string;
  } | null>(null);

  const handleJoin = async () => {
    if (!joinCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/groups/join/${joinCode}`);
      const data = res.data;
      if (data.status === "JOINED" && data.conversation?.id) {
        setActiveConversation(data.conversation.id);
        router.push("/chat");
      } else if (data.status === "PENDING_APPROVAL") {
        setSuccess({
          status: "PENDING_APPROVAL",
          group: data.group,
        });
      } else {
        router.push("/chat");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid or expired group invite link");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace(`/login?redirect=/join/${joinCode}`);
    }
  }, [hydrated, accessToken, router, joinCode]);

  if (!hydrated || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#050505] p-4 text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute h-[400px] w-[400px] rounded-full bg-accent/15 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="glass-strong relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 p-8 shadow-2xl backdrop-blur-2xl"
      >
        {success ? (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock size={32} />
            </div>
            <h1 className="text-xl font-bold">Request Pending Approval</h1>
            <p className="text-sm text-white/60">
              This group requires admin approval. The group admins have been notified of your request.
            </p>
            <Link
              href="/chat"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15 transition"
            >
              Back to Chat <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/20 text-accent border border-accent/30 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
              <Users size={36} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Group Invitation</h1>
              <p className="text-sm text-white/60">
                You&apos;ve been invited to join a group on WispEcho.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-400">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex w-full flex-col gap-3 pt-2">
              <button
                onClick={handleJoin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3.5 font-semibold text-white hover:bg-accent/90 transition shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <span>Join Group</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <Link
                href="/chat"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <ArrowLeft size={14} /> Back to Messages
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
