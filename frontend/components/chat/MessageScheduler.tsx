"use client";

import { useState } from "react";
import { X, Calendar, Clock } from "lucide-react";

interface MessageSchedulerProps {
  onClose: () => void;
  onSchedule: (date: Date) => void;
}

export function MessageScheduler({ onClose, onSchedule }: MessageSchedulerProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;
    const scheduledAt = new Date(`${date}T${time}`);
    if (scheduledAt <= new Date()) {
      alert("Please select a future date and time");
      return;
    }
    onSchedule(scheduledAt);
  };

  // Allow scheduling starting today
  const today = new Date();
  const minDate = today.toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-accent" />
            <h3 className="font-semibold text-white">Schedule Message</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50 flex items-center gap-1">
              <Calendar size={12} /> Date
            </label>
            <input
              type="date"
              min={minDate}
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50 flex items-center gap-1">
              <Clock size={12} /> Time
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent text-sm"
            />
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={!date || !time}
              className="w-full bg-accent text-white rounded-lg py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-accent/90"
            >
              Schedule Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
