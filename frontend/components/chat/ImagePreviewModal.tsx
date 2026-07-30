import { useState, useEffect } from "react";
import { X, Send, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImagePreviewModalProps {
  files: File[];
  onClose: () => void;
  onSend: (fileWithCaptions: { file: File; caption: string }[]) => void;
}

export function ImagePreviewModal({ files, onClose, onSend }: ImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captions, setCaptions] = useState<string[]>(Array(files.length).fill(""));
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  const handleSend = () => {
    const result = files.map((file, i) => ({
      file,
      caption: captions[i] || "",
    }));
    onSend(result);
  };

  if (!files.length || !previews.length) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl h-[80vh] flex flex-col rounded-3xl overflow-hidden bg-[#18181b] shadow-2xl border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/40 border-b border-white/10">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">
            <X size={20} />
          </button>
          <span className="text-white/80 font-medium text-sm">
            {currentIndex + 1} of {files.length}
          </span>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              src={previews[currentIndex]}
              className="max-w-full max-h-full object-contain drop-shadow-xl"
              alt="Preview"
            />
          </AnimatePresence>
        </div>

        {/* Thumbnails if multiple */}
        {files.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto border-t border-white/5 bg-black/20">
            {previews.map((preview, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                  idx === currentIndex ? "border-accent" : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <img src={preview} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
              </button>
            ))}
          </div>
        )}

        {/* Caption & Send */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex items-center gap-3">
          <ImageIcon size={20} className="text-white/40 shrink-0" />
          <input
            type="text"
            value={captions[currentIndex]}
            onChange={(e) => {
              const newCaptions = [...captions];
              newCaptions[currentIndex] = e.target.value;
              setCaptions(newCaptions);
            }}
            placeholder="Add a caption..."
            className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/40"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <button
            onClick={handleSend}
            className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center shrink-0 hover:scale-105 transition shadow-lg"
          >
            <Send size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
