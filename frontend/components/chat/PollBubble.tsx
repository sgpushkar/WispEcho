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

  if (!poll) return <div className="p-3 italic text-white/50">Poll data missing</div>;

  const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0);

  const handleVote = async (optionId: string) => {
    if (poll.isClosed || isVoting) return;
    setIsVoting(true);
    try {
      await api.post(`/polls/${poll.id}/vote`, { optionId });
      // The socket event "poll:updated" will trigger a re-fetch
    } catch (err) {
      console.error("Vote failed:", err);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[260px] bg-white/5 border border-white/10 rounded-xl p-3 select-none">
      <div className="font-semibold text-white mb-2">{poll.question}</div>
      <div className="flex flex-col gap-2">
        {poll.options.map((option: any) => {
          const voteCount = option.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = option.votes?.some((v: any) => v.userId === currentUserId);

          return (
            <div 
              key={option.id} 
              onClick={() => handleVote(option.id)}
              className={`relative overflow-hidden flex items-center justify-between p-2 rounded-lg cursor-pointer border ${isSelected ? 'border-accent/50 bg-accent/10' : 'border-white/10 hover:bg-white/10'}`}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 bg-accent/20 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
              <div className="flex items-center gap-2 relative z-10">
                {isSelected ? <CheckCircle2 size={16} className="text-accent" /> : <Circle size={16} className="text-white/30" />}
                <span className="text-sm text-white/90">{option.text}</span>
              </div>
              <span className="text-xs text-white/50 relative z-10">{percentage}%</span>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-white/40 mt-2 flex justify-between">
        <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        {poll.isClosed && <span className="text-red-400">Closed</span>}
      </div>
    </div>
  );
}
