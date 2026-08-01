"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useImageCache } from "@/hooks/useImageCache";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** Prevent caching and progressive loading for view-once images */
  isViewOnce?: boolean;
}

export function ProgressiveImage({ src, alt, className = "", style, onClick, isViewOnce }: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);

  // Never cache view-once images
  const cachedSrc = useImageCache(src, isViewOnce);

  useEffect(() => {
    // Only generate blur thumbnail for non-view-once cloudinary images
    // (don't generate blurry previews that might partially reveal a view-once image)
    if (!isViewOnce && src.includes("res.cloudinary.com") && src.includes("/upload/")) {
      const parts = src.split("/upload/");
      const thumb = `${parts[0]}/upload/w_10,h_10,e_blur:100/${parts[1]}`;
      setThumbSrc(thumb);
    } else {
      setThumbSrc(null);
    }

    if (!cachedSrc) return;

    const img = new Image();
    img.src = cachedSrc;
    img.onload = () => {
      setCurrentSrc(cachedSrc);
      setIsLoaded(true);
    };
  }, [src, cachedSrc, isViewOnce]);

  return (
    <div 
      className={`relative overflow-hidden bg-white/5 ${className}`} 
      onClick={onClick}
      style={style}
    >
      <AnimatePresence>
        {!isLoaded && thumbSrc && (
          <motion.img
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            src={thumbSrc}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover filter blur-lg scale-110"
          />
        )}
      </AnimatePresence>
      <motion.img
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        src={currentSrc || thumbSrc || ""}
        alt={alt}
        className={`w-full h-full object-cover ${className}`}
        // Prevent browser context menu save for view-once images
        onContextMenu={isViewOnce ? (e) => e.preventDefault() : undefined}
        draggable={isViewOnce ? false : undefined}
      />
    </div>
  );
}
