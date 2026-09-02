import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Video, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { ProgressiveImage } from "../ui/ProgressiveImage";
import { FullscreenImageViewer } from "../ui/FullscreenImageViewer";
import { useSecureImage } from "@/hooks/useSecureImage";
import { useUIStore } from "@/store/useUIStore";

interface SharedMediaModalProps {
  conversationId: string;
  onClose: () => void;
}

interface SharedMediaItem {
  id: string;
  mediaUrl: string;
  type: string;
  createdAt: string;
}

function SecureSharedMediaItem({ item, onClick }: { item: SharedMediaItem; onClick: (url: string) => void }) {
  const isImage = item.type === "IMAGE";
  const { url, loading } = useSecureImage({ messageId: item.id, enabled: isImage });
  const displayUrl = url || item.mediaUrl;

  return (
    <div
      className="aspect-square rounded-xl overflow-hidden bg-black/20 cursor-pointer relative group"
      onClick={() => {
        if (isImage && displayUrl) onClick(displayUrl);
      }}
    >
      {isImage ? (
        loading ? (
          <div className="w-full h-full flex items-center justify-center bg-black/40 text-white/50">
             <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-accent animate-spin" />
          </div>
        ) : displayUrl ? (
          <ProgressiveImage
            src={displayUrl}
            alt="Shared media"
            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/40 text-white/50">
             <ImageIcon size={24} />
          </div>
        )
      ) : item.type === "VIDEO" ? (
        <div className="w-full h-full flex items-center justify-center bg-black/40 text-white/50 group-hover:text-white transition">
          <Video size={24} />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/40 text-white/50 group-hover:text-white transition">
          <FileText size={24} />
        </div>
      )}
    </div>
  );
}

export function SharedMediaModal({ conversationId, onClose }: SharedMediaModalProps) {
  const [media, setMedia] = useState<SharedMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; item: SharedMediaItem } | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchMedia = async () => {
      try {
        const res = await api.get(`/messages/conversations/${conversationId}/media`);
        if (mounted) {
          setMedia(res.data.media);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };
    fetchMedia();
    return () => { mounted = false; };
  }, [conversationId]);

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl h-[80vh] flex flex-col rounded-3xl overflow-hidden glass border border-white/10 shadow-2xl"
        >
          <div className="flex justify-between items-center p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Shared Media</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-accent animate-spin" />
              </div>
            ) : media.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/40">
                <ImageIcon size={48} className="mb-4 opacity-50" />
                <p>No media shared in this chat yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {media.map((item) => (
                  <SecureSharedMediaItem 
                    key={item.id} 
                    item={item} 
                    onClick={(url) => setSelectedMedia({ url, item })} 
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedMedia && (
          <FullscreenImageViewer
            url={selectedMedia.url}
            onClose={() => setSelectedMedia(null)}
            onReport={() => {
              useUIStore.getState().openReportModal({
                type: "MEDIA",
                messageId: selectedMedia.item.id,
                mediaUrl: selectedMedia.url,
              });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
