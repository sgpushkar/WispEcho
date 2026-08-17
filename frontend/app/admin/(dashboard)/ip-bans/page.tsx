"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi as api } from "@/lib/adminApi";
import { Ban, Trash2, Plus } from "lucide-react";

interface IpBanRow {
  id: string;
  ipAddress: string;
  reason: string;
  bannedById: string;
  bannedBy: { displayName: string; username: string };
  createdAt: string;
}

export default function IpBansPage() {
  const [bans, setBans] = useState<IpBanRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [ipAddress, setIpAddress] = useState("");
  const [reason, setReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);

  const fetchBans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/ip-bans");
      setBans(res.data.bans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBans();
  }, [fetchBans]);

  const handleBan = async () => {
    if (!ipAddress.trim()) return;
    setIsBanning(true);
    try {
      await api.post("/admin/ip-bans", { ipAddress, reason });
      setIpAddress("");
      setReason("");
      fetchBans();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to ban IP");
    } finally {
      setIsBanning(false);
    }
  };

  const handleRemove = async (ip: string) => {
    if (!confirm(`Remove ban for IP ${ip}?`)) return;
    try {
      await api.delete(`/admin/ip-bans/${encodeURIComponent(ip)}`);
      fetchBans();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to remove ban");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">IP Bans</h1>
        <p className="admin-page-sub">Manage banned IP addresses.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="admin-card p-6 space-y-4">
            <h2 className="admin-card-title flex items-center gap-2">
              <Ban size={18} /> Ban New IP
            </h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--admin-text-muted)]">IP Address</label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="e.g. 192.168.1.1"
                  className="w-full bg-[var(--admin-bg-dark)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--admin-primary)] text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--admin-text-muted)]">Reason (Optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Spamming..."
                  className="w-full bg-[var(--admin-bg-dark)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-white outline-none focus:border-[var(--admin-primary)] text-sm"
                />
              </div>
              <button
                onClick={handleBan}
                disabled={!ipAddress.trim() || isBanning}
                className="admin-btn admin-btn-primary w-full justify-center disabled:opacity-50 mt-2"
              >
                {isBanning ? "Banning..." : <><Plus size={16} /> Add Ban</>}
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="admin-card">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Reason</th>
                    <th>Banned By</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                        Loading…
                      </td>
                    </tr>
                  ) : bans.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                        No banned IPs found
                      </td>
                    </tr>
                  ) : (
                    bans.map((b) => (
                      <tr key={b.id}>
                        <td className="font-mono text-sm">{b.ipAddress}</td>
                        <td className="text-[var(--admin-text-muted)] text-sm">{b.reason || "—"}</td>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-avatar-sm">
                              <span>{b.bannedBy?.displayName?.[0]?.toUpperCase() || "?"}</span>
                            </div>
                            <div className="admin-user-cell-info">
                              <div className="name">{b.bannedBy?.displayName}</div>
                              <div className="email">@{b.bannedBy?.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-[var(--admin-text-muted)] text-xs">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemove(b.ipAddress)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition"
                            title="Remove Ban"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
