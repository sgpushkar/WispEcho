import { useState, useEffect } from "react";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface FullscreenImageViewerProps {
  url: string;
  caption?: string;
  onClose: () => void;
}

export function FullscreenImageViewer({ url, caption, onClose }: FullscreenImageViewerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "image.jpg"; // Could parse from URL ideally
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition bg-black/20">
          <X size={24} />
        </button>
        <button onClick={handleDownload} className="p-2 rounded-full hover:bg-white/10 text-white transition bg-black/20">
          <Download size={20} />
        </button>
      </div>

      {/* Main Image Area with Zoom/Pan */}
      <div className="w-full h-full flex items-center justify-center">
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
      </div>

      {/* Caption Bar */}
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center z-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          <p className="text-white text-sm bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl max-w-2xl text-center shadow-xl border border-white/10 pointer-events-auto">
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}
