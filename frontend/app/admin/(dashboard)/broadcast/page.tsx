"use client";

import { useState } from "react";
import { adminApi as api } from "@/lib/adminApi";
import { Megaphone } from "lucide-react";

export default function BroadcastPage() {
  const [message, setMessage] = useState("");
  const [tier, setTier] = useState<"ALL" | "FREE" | "PRO">("ALL");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!confirm("Are you sure you want to send this broadcast message?")) return;

    setLoading(true);
    setStatus(null);
    try {
      const res = await api.post("/admin/broadcast", {
        message,
        target: tier,
      });
      setStatus({ type: "success", msg: `Broadcast sent to ${res.data.count} users.` });
      setMessage("");
    } catch (err: any) {
      setStatus({ type: "error", msg: err.response?.data?.error || "Failed to send broadcast" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Broadcast Message</h1>
        <p className="admin-page-sub">Send a system message to all users or specific tiers.</p>
      </div>

      <div className="admin-card max-w-2xl">
        <div className="admin-card-header">
          <h2 className="admin-card-title flex items-center gap-2">
            <Megaphone size={18} /> New Broadcast
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          {status && (
            <div className={`p-3 rounded-lg text-sm ${status.type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
              {status.msg}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">Target Audience</label>
            <select 
              value={tier} 
              onChange={(e) => setTier(e.target.value as any)}
              className="w-full bg-[var(--admin-bg-dark)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--admin-primary)]"
            >
              <option value="ALL">All Users</option>
              <option value="FREE">Free Users Only</option>
              <option value="PRO">Pro Users Only</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">Message Content</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Type your message here..."
              className="w-full bg-[var(--admin-bg-dark)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--admin-primary)] resize-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim() || loading}
            className="admin-btn admin-btn-primary w-full justify-center disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
}
