import { useState, useEffect } from "react";
import { Mic, Square, Trash2, Send, Pause, Play } from "lucide-react";
import { motion } from "framer-motion";

interface VoiceRecorderProps {
  isRecording: boolean;
  recordingTime: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onSend: () => void;
}

export function VoiceRecorder({
  isRecording,
  recordingTime,
  isPaused,
  onPause,
  onResume,
  onCancel,
  onSend,
}: VoiceRecorderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-x-0 bottom-0 bg-[#09090b]/95 backdrop-blur-md p-4 flex items-center justify-between border-t border-white/10 z-40"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full transition flex items-center justify-center"
          title="Discard"
        >
          <Trash2 size={18} />
        </button>
        <div className="flex items-center gap-2">
          <motion.div
            animate={isPaused ? {} : { scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`w-3.5 h-3.5 rounded-full ${isPaused ? "bg-white/40" : "bg-red-500"}`}
          />
          <span className="text-white font-medium text-sm font-mono min-w-[40px]">
            {formatTime(recordingTime)}
          </span>
        </div>
      </div>

      {/* Visualizer Animation */}
      {!isPaused && (
        <div className="flex items-center gap-1.5 px-4 flex-1 justify-center max-w-[200px] sm:max-w-[400px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
            <motion.div
              key={i}
              animate={{
                height: [8, Math.random() * 24 + 8, 8],
              }}
              transition={{
                duration: 0.5 + Math.random() * 0.3,
                repeat: Infinity,
              }}
              className="w-1 bg-accent/60 rounded-full"
            />
          ))}
        </div>
      )}
      {isPaused && (
        <div className="text-white/40 text-xs font-medium tracking-wide">Recording paused</div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={isPaused ? onResume : onPause}
          className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition flex items-center justify-center"
          title={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        <button
          onClick={onSend}
          className="p-3 bg-accent hover:scale-105 active:scale-95 text-white rounded-full transition flex items-center justify-center shadow-lg"
          title="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </motion.div>
  );
}
