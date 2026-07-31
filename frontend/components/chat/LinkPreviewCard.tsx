import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Link2 } from "lucide-react";

interface LinkPreviewData {
  title: string;
  description: string | null;
  image: string | null;
  url: string;
  domain: string;
}

export function LinkPreviewCard({ url }: { url: string }) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchPreview = async () => {
      try {
        const res = await api.get(`/linkpreview?url=${encodeURIComponent(url)}`);
        if (mounted) {
          setData(res.data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };
    
    fetchPreview();
    return () => { mounted = false; };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 w-full max-w-[300px] h-24 bg-white/5 animate-pulse rounded-xl border border-white/5"></div>
    );
  }

  if (!data) return null;

  return (
    <a 
      href={data.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="mt-2 block w-full max-w-[350px] bg-black/20 rounded-xl overflow-hidden border border-white/10 hover:bg-black/30 transition shadow-lg group"
    >
      {data.image && (
        <div className="w-full h-32 overflow-hidden bg-black/40">
          <img src={data.image} alt={data.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        </div>
      )}
      <div className="p-3 flex flex-col gap-1">
        <h4 className="text-white font-medium text-sm line-clamp-1">{data.title}</h4>
        {data.description && (
          <p className="text-white/60 text-xs line-clamp-2 leading-relaxed">{data.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1 text-white/40 text-[10px] uppercase font-semibold tracking-wider">
          <Link2 size={10} />
          <span>{data.domain}</span>
        </div>
      </div>
    </a>
  );
}
