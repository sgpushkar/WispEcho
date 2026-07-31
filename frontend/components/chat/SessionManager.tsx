import { useState, useEffect } from "react";
import { Laptop, Smartphone, Trash2, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";

interface Session {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
}

export function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get("/auth/sessions");
      setSessions(res.data.sessions);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (id: string) => {
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to terminate session", err);
    }
  };

  const parseUA = (ua: string | null) => {
    if (!ua) return { browser: "Unknown Browser", os: "Unknown OS" };
    
    let os = "Unknown OS";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Macintosh")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    let browser = "Unknown Browser";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";
    else if (ua.includes("Opera")) browser = "Opera";

    return { browser, os };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-white/50 text-[11px] font-semibold uppercase tracking-wider mb-2">
        <ShieldAlert size={14} />
        <span>Active Devices</span>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {sessions.map((session, idx) => {
          const { browser, os } = parseUA(session.userAgent);
          const isMobile = os === "Android" || os === "iOS";
          
          return (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/5 rounded-xl text-white/60">
                  {isMobile ? <Smartphone size={18} /> : <Laptop size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">
                    {browser} on {os} {idx === 0 && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full ml-1 font-semibold uppercase tracking-wider">Current</span>}
                  </span>
                  <span className="text-white/40 text-xs mt-0.5">
                    IP: {session.ip || "Unknown"} • {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {idx !== 0 && (
                <button
                  onClick={() => terminateSession(session.id)}
                  className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-full transition"
                  title="Terminate Session"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
