"use client";

import { useState, useEffect } from "react";

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
}

export function Avatar({ src, name = "?", className = "" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  // Generate a deterministic gradient color based on the name hash
  const getGradient = (text: string) => {
    const gradients = [
      "from-[#8b5cf6] to-[#6366f1]", // purple to indigo
      "from-[#3b82f6] to-[#06b6d4]", // blue to cyan
      "from-[#10b981] to-[#059669]", // emerald to green
      "from-[#f59e0b] to-[#d97706]", // amber to orange
      "from-[#ec4899] to-[#db2777]", // pink to rose
      "from-[#ef4444] to-[#f43f5e]", // red to rose
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const bgGradient = getGradient(name);

  return (
    <div
      className={`relative overflow-hidden shrink-0 flex items-center justify-center select-none font-bold text-white shadow-sm border border-white/10 ${className}`}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-tr ${bgGradient} flex items-center justify-center text-xs tracking-wider font-semibold`}>
          {initials}
        </div>
      )}
    </div>
  );
}
