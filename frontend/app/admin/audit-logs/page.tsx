"use client";

import { useEffect, useState, useCallback } from "react";
import { ScrollText } from "lucide-react";
import { api } from "@/lib/api";

interface AuditLog {
  id: string;
  action: string;
  targetUserId?: string;
  targetResourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  admin?: { id: string; username: string; email: string };
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/audit-logs", { params: { page, limit } });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const actionColor = (action: string) => {
    if (action.includes("GRANT") || action.includes("RECORD")) return "var(--admin-success)";
    if (action.includes("REVOKE") || action.includes("SUSPEND")) return "var(--admin-danger)";
    if (action.includes("UPDATE")) return "var(--admin-info)";
    return "var(--admin-accent)";
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Audit Logs</h1>
        <p className="admin-page-sub">{total} total admin actions recorded</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title"><ScrollText size={14} style={{ marginRight: 6, display: "inline" }} />Action History</span>
        </div>

        {loading ? (
          <div className="admin-empty"><div className="admin-spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="admin-empty">
            <ScrollText size={40} />
            <p>No audit events yet</p>
          </div>
        ) : (
          <>
            <div className="admin-timeline">
              {logs.map((log) => (
                <div className="admin-timeline-item" key={log.id}>
                  <div className="admin-timeline-dot" style={{ background: actionColor(log.action) }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="admin-timeline-action" style={{ color: actionColor(log.action) }}>
                        {log.action}
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <span style={{ fontSize: 11, color: "var(--admin-text-muted)", background: "var(--admin-surface-2)", padding: "2px 8px", borderRadius: 999, border: "1px solid var(--admin-border)" }}>
                          {Object.entries(log.metadata).slice(0, 2).map(([k, v]) => `${k}=${v}`).join(" · ")}
                        </span>
                      )}
                    </div>
                    <div className="admin-timeline-meta">
                      {new Date(log.createdAt).toLocaleString()}
                      {log.admin && ` · by @${log.admin.username}`}
                      {log.targetUserId && ` · target: ${log.targetUserId.slice(0, 8)}…`}
                      {log.ipAddress && ` · ${log.ipAddress}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="admin-pagination">
                <span>{total} logs · Page {page} of {totalPages}</span>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
