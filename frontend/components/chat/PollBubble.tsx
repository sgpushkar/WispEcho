"use client";

import { useState } from "react";
import { Message } from "@/store/useChatStore";
import { api } from "@/lib/api";
import { CheckCircle2, Circle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface PollBubbleProps {
  message: Message;
}

export function PollBubble({ message }: PollBubbleProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const poll = message.poll;
  const [isVoting, setIsVoting] = useState(false);

  if (!poll) return <div className="p-3 italic text-white/50 text-xs">Poll data unavailable</div>;

  const totalVotes = poll.totalVotes ?? (poll.results?.reduce((sum: number, r: any) => sum + (r.votes || 0), 0) ?? 0);
  const isClosed = Boolean(poll.closedAt || (poll.endsAt && new Date(poll.endsAt) < new Date()));
  const myVote = poll.myVote || [];

  const handleVote = async (index: number) => {
    if (isClosed || isVoting) return;
    setIsVoting(true);
    try {
      await api.post(`/polls/${poll.id}/vote`, { optionIndexes: [index] });
    } catch (err: any) {
      alert(err.response?.data?.error || "Vote failed");
    } finally {
      setIsVoting(false);
    }
  };

  const results = poll.results || (poll.options || []).map((opt: string, idx: number) => ({
    index: idx,
    label: opt,
    votes: 0,
    voters: [],
  }));

  return (
    <div className="flex flex-col w-full min-w-[220px] max-w-[280px] sm:max-w-[320px] bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 select-none my-1">
      <div className="font-semibold text-white text-sm mb-2.5 leading-snug">{poll.question}</div>
      <div className="flex flex-col gap-2">
        {results.map((opt: any) => {
          const voteCount = opt.votes || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = myVote.includes(opt.index) || opt.voters?.includes(currentUserId);

          return (
            <button
              key={opt.index}
              disabled={isClosed || isVoting}
              onClick={() => handleVote(opt.index)}
              className={`relative overflow-hidden w-full flex items-center justify-between p-2.5 rounded-xl transition text-left border ${
                isSelected
                  ? "border-accent/60 bg-accent/15 text-white"
                  : "border-white/10 hover:border-white/20 bg-white/5 text-white/90"
              }`}
            >
              <div
                className="absolute left-0 top-0 bottom-0 bg-accent/25 transition-all duration-500 rounded-xl"
                style={{ width: `${percentage}%` }}
              />
              <div className="flex items-center gap-2.5 relative z-10 min-w-0 pr-2">
                {isSelected ? (
                  <CheckCircle2 size={16} className="text-accent shrink-0" />
                ) : (
                  <Circle size={16} className="text-white/30 shrink-0" />
                )}
                <span className="text-xs sm:text-[13px] font-medium truncate">{opt.label}</span>
              </div>
              <span className="text-[11px] text-white/60 font-semibold relative z-10 shrink-0">
                {percentage}%
              </span>
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-white/40 mt-2.5 flex items-center justify-between font-medium">
        <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
        {isClosed && <span className="text-red-400 font-semibold">Closed</span>}
      </div>
    </div>
  );
}
