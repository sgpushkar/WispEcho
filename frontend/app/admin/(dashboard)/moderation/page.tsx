"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi as api } from "@/lib/adminApi";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Report {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { displayName: string; username: string };
  reportedUser?: { displayName: string; username: string };
  message?: { content: string };
}

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/reports", { params: { status: statusFilter } });
      setReports(res.data.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAction = async (id: string, action: "resolve" | "dismiss") => {
    if (!confirm(`Are you sure you want to ${action} this report?`)) return;
    try {
      if (action === "resolve") {
        await api.delete(`/admin/reports/${id}/content`);
      } else {
        await api.patch(`/admin/reports/${id}`, { status: "DISMISSED" });
      }
      fetchReports();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${action} report`);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Moderation Queue</h1>
        <p className="admin-page-sub">Review user reports and flagged messages.</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header flex justify-between items-center">
          <div className="flex gap-2">
            {["PENDING", "RESOLVED", "DISMISSED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${statusFilter === status ? "bg-[var(--admin-primary)] text-black" : "bg-white/5 text-[var(--admin-text-muted)] hover:bg-white/10"}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reporter</th>
                <th>Target</th>
                <th>Reason / Content</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                    No {statusFilter.toLowerCase()} reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar-sm">
                          <span>{report.reporter?.displayName?.[0]?.toUpperCase() || "?"}</span>
                        </div>
                        <div className="admin-user-cell-info">
                          <div className="name">{report.reporter?.displayName}</div>
                          <div className="email">@{report.reporter?.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {report.reportedUser ? (
                        <div className="admin-user-cell">
                          <div className="admin-avatar-sm">
                            <span>{report.reportedUser?.displayName?.[0]?.toUpperCase() || "?"}</span>
                          </div>
                          <div className="admin-user-cell-info">
                            <div className="name">{report.reportedUser?.displayName}</div>
                            <div className="email">@{report.reportedUser?.username}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--admin-text-muted)] text-sm">System / Unknown</span>
                      )}
                    </td>
                    <td>
                      <div className="text-sm font-medium text-white">{report.reason}</div>
                      {report.message && (
                        <div className="text-xs text-[var(--admin-text-muted)] mt-1 truncate max-w-xs bg-white/5 p-1 rounded">
                          "{report.message.content}"
                        </div>
                      )}
                    </td>
                    <td className="text-[var(--admin-text-muted)] text-xs">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {report.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(report.id, "resolve")}
                            className="p-1.5 text-green-500 hover:bg-green-500/10 rounded transition"
                            title="Resolve & Take Action"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleAction(report.id, "dismiss")}
                            className="p-1.5 text-[var(--admin-text-muted)] hover:text-white hover:bg-white/10 rounded transition"
                            title="Dismiss Report"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className={`admin-badge ${report.status === "RESOLVED" ? "admin" : "user"}`}>
                          {report.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
