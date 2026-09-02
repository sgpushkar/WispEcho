"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi as api } from "@/lib/adminApi";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  User, 
  Image as ImageIcon, 
  MessageSquare, 
  ExternalLink,
  ShieldAlert,
  Trash2
} from "lucide-react";
import Link from "next/link";

interface Report {
  id: string;
  reason: string;
  status: string;
  contentType: string;
  contentId?: string;
  createdAt: string;
  reporter: { id: string; displayName: string; username: string; avatarUrl?: string };
  reported?: { id: string; displayName: string; username: string; avatarUrl?: string };
  reportedUser?: { id: string; displayName: string; username: string; avatarUrl?: string };
  message?: {
    id: string;
    content: string | null;
    mediaUrl: string | null;
    type: string;
    isDeleted: boolean;
  };
}

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    const promptMsg = action === "resolve"
      ? "Are you sure you want to resolve this report and delete flagged content (if applicable)?"
      : "Are you sure you want to dismiss this report?";

    if (!confirm(promptMsg)) return;

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

  const renderTypeBadge = (type: string) => {
    switch (type?.toUpperCase()) {
      case "MEDIA":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <ImageIcon size={11} />
            Media
          </span>
        );
      case "MESSAGE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <MessageSquare size={11} />
            Message
          </span>
        );
      case "USER":
      case "PROFILE":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <User size={11} />
            Profile
          </span>
        );
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Moderation Queue</h1>
        <p className="admin-page-sub">Review user reports, flagged profiles, media files, and messages.</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header flex justify-between items-center">
          <div className="flex gap-2">
            {["PENDING", "RESOLVED", "DISMISSED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                  statusFilter === status
                    ? "bg-[var(--admin-primary)] text-black"
                    : "bg-white/5 text-[var(--admin-text-muted)] hover:bg-white/10"
                }`}
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
                <th>Type</th>
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
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                    No {statusFilter.toLowerCase()} reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const targetUser = report.reported || report.reportedUser;
                  return (
                    <tr key={report.id}>
                      <td>
                        {renderTypeBadge(report.contentType)}
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-avatar-sm">
                            {report.reporter?.avatarUrl ? (
                              <img src={report.reporter.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span>{report.reporter?.displayName?.[0]?.toUpperCase() || "?"}</span>
                            )}
                          </div>
                          <div className="admin-user-cell-info">
                            <div className="name">{report.reporter?.displayName}</div>
                            <div className="email">@{report.reporter?.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {targetUser ? (
                          <div className="admin-user-cell">
                            <div className="admin-avatar-sm">
                              {targetUser.avatarUrl ? (
                                <img src={targetUser.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                              ) : (
                                <span>{targetUser.displayName?.[0]?.toUpperCase() || "?"}</span>
                              )}
                            </div>
                            <div className="admin-user-cell-info">
                              <div className="name flex items-center gap-1.5">
                                <span>{targetUser.displayName}</span>
                                {targetUser.id && (
                                  <Link
                                    href={`/admin/users/detail?id=${targetUser.id}`}
                                    className="text-white/40 hover:text-[var(--admin-primary)] transition"
                                    title="View user details in Admin"
                                  >
                                    <ExternalLink size={12} />
                                  </Link>
                                )}
                              </div>
                              <div className="email">@{targetUser.username}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--admin-text-muted)] text-sm">System / Unknown</span>
                        )}
                      </td>
                      <td className="max-w-xs">
                        <div className="text-sm font-medium text-white break-words">{report.reason}</div>
                        
                        {/* Message / Media Preview */}
                        {report.message && (
                          <div className="mt-2 p-2 rounded-xl bg-white/5 border border-white/5 space-y-1">
                            {report.message.content && (
                              <p className="text-xs text-[var(--admin-text-muted)] italic line-clamp-2">
                                "{report.message.content}"
                              </p>
                            )}
                            {report.message.mediaUrl && (
                              <div className="flex items-center gap-2 mt-1">
                                <img
                                  src={report.message.mediaUrl}
                                  alt="Reported Media Preview"
                                  onClick={() => setPreviewImage(report.message?.mediaUrl || null)}
                                  className="w-12 h-12 object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-80 transition"
                                />
                                <span className="text-[10px] text-white/40">Click thumbnail to view</span>
                              </div>
                            )}
                            {report.message.isDeleted && (
                              <span className="text-[10px] text-red-400 font-semibold block">
                                [Content already deleted]
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-[var(--admin-text-muted)] text-xs whitespace-nowrap">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        {report.status === "PENDING" || report.status === "OPEN" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(report.id, "resolve")}
                              className="p-1.5 text-green-500 hover:bg-green-500/10 rounded transition"
                              title="Resolve & Delete Violating Content"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
