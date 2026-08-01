import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface VoicePlayerProps {
  url: string;
  isMine: boolean;
}

export function VoicePlayer({ url, isMine }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    if (audio.duration) setDuration(audio.duration);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error("Playback failed:", err));
      setIsPlaying(true);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl w-full min-w-0 ${
        isMine
          ? "bg-accent/10 border border-accent/20"
          : "bg-white/5 border border-white/10"
      }`}
    >
      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
          isMine
            ? "bg-accent text-white hover:brightness-110"
            : "bg-white/15 hover:bg-white/25 text-white"
        }`}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Progress + times */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Custom progress bar */}
        <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden cursor-pointer">
          {/* Filled portion */}
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all ${
              isMine ? "bg-accent" : "bg-white/50"
            }`}
            style={{ width: `${progress}%` }}
          />
          {/* Invisible range input over the bar */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Time stamps */}
        <div className="flex justify-between text-[10px] font-mono leading-none">
          <span className="text-white/50">{formatTime(currentTime)}</span>
          <span className="text-white/30">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Mic icon — animated when playing */}
      <div className={`shrink-0 ${isPlaying ? "opacity-100" : "opacity-30"} transition`}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-white ${isPlaying ? "animate-pulse" : ""}`}
        >
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </div>
    </div>
  );
}
