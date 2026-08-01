"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Download, Eye, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface FullscreenImageViewerProps {
  url: string;
  caption?: string;
  onClose: () => void;
  /** When true: no download, canvas rendering, auto-close timer, screenshot detection */
  isViewOnce?: boolean;
  /** Auto-close timer in seconds for view-once images */
  viewOnceTimeoutSeconds?: number;
}

const VIEW_ONCE_DURATION = 10; // seconds

export function FullscreenImageViewer({
  url,
  caption,
  onClose,
  isViewOnce = false,
  viewOnceTimeoutSeconds = VIEW_ONCE_DURATION,
}: FullscreenImageViewerProps) {
  const [timeLeft, setTimeLeft] = useState(viewOnceTimeoutSeconds);
  const [imageLoaded, setImageLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closingRef = useRef(false);

  // ─── Keyboard ESC ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // ─── Download (non view-once only) ──────────────────────────────────────────
  const handleDownload = () => {
    if (isViewOnce) return; // silently block
    const a = document.createElement("a");
    a.href = url;
    a.download = "image.jpg";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─── Canvas rendering for view-once ─────────────────────────────────────────
  // Render the image onto a canvas element instead of an <img> tag.
  // Canvas elements don't have a "Save Image As" context menu option.
  const drawImageToCanvas = useCallback((imgSrc: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Size canvas to image, capped at viewport
      const maxW = window.innerWidth * 0.9;
      const maxH = window.innerHeight * 0.8;
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Subtle watermark overlay — deters casual re-capture
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(16, canvas.width / 20)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = "VIEW ONCE • WISPECHO";
      // Diagonal repeating watermark
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6);
      for (let y = -canvas.height; y < canvas.height; y += 80) {
        ctx.fillText(text, 0, y);
      }
      ctx.restore();

      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageLoaded(true); // show canvas even if load fails
    };
    img.src = imgSrc;
  }, []);

  useEffect(() => {
    if (isViewOnce && url) {
      drawImageToCanvas(url);
    } else if (url) {
      setImageLoaded(true);
    }
  }, [url, isViewOnce, drawImageToCanvas]);

  // ─── Auto-close timer (view-once) ────────────────────────────────────────────
  useEffect(() => {
    if (!isViewOnce) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (!closingRef.current) {
            closingRef.current = true;
            onClose();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isViewOnce, onClose]);

  // ─── Screenshot detection (view-once) ────────────────────────────────────────
  // If the user switches tabs/apps (common when taking a screenshot on many devices),
  // auto-close immediately. Also catch PrintScreen / cmd+shift+3-4 focus loss.
  useEffect(() => {
    if (!isViewOnce) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !closingRef.current) {
        closingRef.current = true;
        onClose();
      }
    };

    const handleWindowBlur = () => {
      if (!closingRef.current) {
        closingRef.current = true;
        onClose();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isViewOnce, onClose]);

  // ─── Prevent context menu globally while viewer is open (view-once) ──────────
  useEffect(() => {
    if (!isViewOnce) return;
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, [isViewOnce]);

  // ─── Timer ring progress ─────────────────────────────────────────────────────
  const timerProgress = timeLeft / viewOnceTimeoutSeconds;
  const circumference = 2 * Math.PI * 18; // radius = 18

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/97 backdrop-blur-xl"
      // Block drag-to-save on the entire overlay
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-white transition bg-black/20"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3">
          {isViewOnce && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-full px-3 py-1.5">
              {/* Countdown ring */}
              <svg width="44" height="44" className="rotate-[-90deg]">
                <circle cx="22" cy="22" r="18" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                <circle
                  cx="22" cy="22" r="18"
                  stroke={timeLeft <= 3 ? "#ef4444" : "#f97316"}
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - timerProgress)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s ease" }}
                />
                <text
                  x="22" y="22"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                  className="rotate-90"
                  style={{ transform: "rotate(90deg)", transformOrigin: "22px 22px" }}
                >
                  {timeLeft}s
                </text>
              </svg>
              <div className="flex items-center gap-1.5">
                <Eye size={14} className="text-orange-400" />
                <span className="text-xs font-semibold text-white/90">View Once</span>
              </div>
            </div>
          )}

          {/* Screenshot warning badge for view-once */}
          {isViewOnce && (
            <div className="hidden sm:flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-3 py-1.5">
              <ShieldAlert size={13} className="text-yellow-400" />
              <span className="text-[11px] text-white/60">Screenshot detected = auto-close</span>
            </div>
          )}

          {/* Download — hidden for view-once images */}
          {!isViewOnce && (
            <button
              onClick={handleDownload}
              className="p-2 rounded-full hover:bg-white/10 text-white transition bg-black/20"
            >
              <Download size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Main Image Area */}
      <div className="w-full h-full flex items-center justify-center">
        {isViewOnce ? (
          // Canvas rendering for view-once — blocks "Save Image As" and right-click
          <div className="flex items-center justify-center w-full h-full">
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: "90vw",
                maxHeight: "80vh",
                objectFit: "contain",
                userSelect: "none",
                WebkitUserSelect: "none",
                pointerEvents: "none", // Prevents right-click and drag
                opacity: imageLoaded ? 1 : 0,
                transition: "opacity 0.4s ease",
              }}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : (
          // Standard zoom/pan viewer for regular images
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={5}
            centerOnInit={true}
            wheel={{ step: 0.1 }}
          >
            {({ zoomIn, zoomOut }) => (
              <>
                <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-10 hidden sm:flex">
                  <button onClick={() => zoomIn()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition">
                    <ZoomIn size={20} />
                  </button>
                  <button onClick={() => zoomOut()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition">
                    <ZoomOut size={20} />
                  </button>
                </div>
                <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                  <motion.img
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    src={url}
                    className="max-w-full max-h-[85vh] object-contain cursor-grab active:cursor-grabbing"
                    alt="Fullscreen view"
                    draggable={false}
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>

      {/* Caption Bar */}
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center z-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          <p className="text-white text-sm bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl max-w-2xl text-center shadow-xl border border-white/10 pointer-events-auto">
            {caption}
          </p>
        </div>
      )}
    </motion.div>
  );
}
