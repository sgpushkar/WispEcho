"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Crown, ShieldCheck, ArrowLeft, IndianRupee, 
  XCircle, Plus, Activity, CreditCard,
} from "lucide-react";
import { adminApi as api } from "@/lib/adminApi";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

interface UserDetail {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  isPro: boolean;
  createdAt: string;
  lastSeen: string;
  avatarUrl?: string;
  bio?: string;
  subscription?: {
    plan: string;
    status: string;
    source: string;
    expiresAt?: string;
    notes?: string;
  };
  payments?: any[];
  auditLogs?: any[];
}

function RecordPaymentModal({ userId, onClose, onSuccess }: { userId: string; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [grantDays, setGrantDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount))) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/admin/payments/record", {
        userId,
        amount: Number(amount),
        method,
        reference,
        notes,
        grantProDays: Number(grantDays),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="admin-modal-title">
          <IndianRupee size={18} style={{ color: "var(--admin-accent)" }} />
          Record Manual Payment
        </h3>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>Amount (INR) *</label>
            <input
              className="admin-input"
              type="number"
              placeholder="e.g. 149"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label>Payment Method</label>
            <select className="admin-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label>Reference / UTR (optional)</label>
          <input
            className="admin-input"
            type="text"
            placeholder="e.g. UPI Ref: 123456789012"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        <div className="admin-form-group">
          <label>Grant Pro for (days)</label>
          <select className="admin-select" value={grantDays} onChange={(e) => setGrantDays(e.target.value)}>
            <option value="0">Don't grant Pro (payment only)</option>
            <option value="30">30 days (monthly)</option>
            <option value="90">90 days (quarterly)</option>
            <option value="180">180 days (6 months)</option>
            <option value="365">365 days (yearly)</option>
            <option value="36500">Lifetime (100 years)</option>
          </select>
        </div>

        <div className="admin-form-group">
          <label>Notes (optional)</label>
          <input
            className="admin-input"
            type="text"
            placeholder="Any admin notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <p style={{ color: "var(--admin-danger)", fontSize: 13, marginBottom: 8 }}>{error}</p>
        )}

        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="admin-btn admin-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Recording…" : "Record & Grant"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserDetailPageClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") as string;
  const router = useRouter();
  const { user: adminUser } = useAdminAuthStore();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      setUser(data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [id]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to revoke this user's Pro subscription?")) return;
    setRevoking(true);
    try {
      await api.post(`/admin/users/${id}/revoke`, { reason: "Revoked by admin" });
      showToast("Pro subscription revoked", "success");
      await fetchUser();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Failed to revoke", "error");
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading" style={{ minHeight: "60vh" }}>
        <div className="admin-spinner" />
      </div>
    );
  }

  if (!user) {
    return <div className="admin-page-header"><h1 className="admin-page-title">User not found</h1></div>;
  }

  const subStatusClass = user.subscription?.status?.toLowerCase() || "free";

  return (
    <div>
      {toast && (
        <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>
      )}

      {paymentModal && (
        <RecordPaymentModal
          userId={id}
          onClose={() => setPaymentModal(false)}
          onSuccess={() => { fetchUser(); showToast("Payment recorded & Pro granted!", "success"); }}
        />
      )}

      <div className="admin-page-header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          className="admin-btn admin-btn-secondary admin-btn-sm"
          onClick={() => router.back()}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h1 className="admin-page-title">User Detail</h1>
          <p className="admin-page-sub">@{user.username}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button className="admin-btn admin-btn-primary" onClick={() => setPaymentModal(true)}>
            <Plus size={15} /> Record Payment
          </button>
          {user.isPro && (
            <button
              className="admin-btn admin-btn-danger"
              onClick={handleRevoke}
              disabled={revoking}
            >
              <XCircle size={15} /> Revoke Pro
            </button>
          )}
        </div>
      </div>

      <div className="admin-detail-grid">
        {/* Profile Card */}
        <div>
          <div className="admin-detail-profile">
            <div className="admin-detail-avatar">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} />
              ) : (
                user.displayName?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <div className="admin-detail-name">{user.displayName}</div>
              <div className="admin-detail-username">@{user.username}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {user.isPro && (
                <span className="admin-badge pro"><Crown size={10} /> Pro</span>
              )}
              <span className={`admin-badge ${user.role?.toLowerCase().replace("_", "") || "user"}`}>
                <ShieldCheck size={10} /> {user.role?.replace("_", " ") || "USER"}
              </span>
            </div>

            <div className="admin-meta-list">
              {[
                ["Email", user.email],
                ["Joined", new Date(user.createdAt).toLocaleDateString()],
                ["Last Seen", new Date(user.lastSeen).toLocaleString()],
                ["Bio", user.bio || "—"],
              ].map(([k, v]) => (
                <div className="admin-meta-row" key={k}>
                  <span className="key">{k}</span>
                  <span className="val">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Card */}
          <div className="admin-card" style={{ marginTop: 16 }}>
            <div className="admin-card-header">
              <span className="admin-card-title">Subscription</span>
            </div>
            <div style={{ padding: 16 }}>
              {user.subscription ? (
                <div>
                  {[
                    ["Plan", user.subscription.plan],
                    ["Status", <span className={`admin-badge ${subStatusClass}`}>{user.subscription.status}</span>],
                    ["Source", user.subscription.source],
                    ["Expires", user.subscription.expiresAt ? new Date(user.subscription.expiresAt).toLocaleDateString() : "Never"],
                    ["Notes", user.subscription.notes || "—"],
                  ].map(([k, v]: any) => (
                    <div className="admin-meta-row" key={k}>
                      <span className="key">{k}</span>
                      <span className="val">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--admin-text-muted)", fontSize: 13 }}>No subscription — Free plan</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Recent Payments */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title"><CreditCard size={14} style={{ marginRight: 6, display: "inline" }} />Payments</span>
            </div>
            <div className="admin-table-wrap">
              {user.payments && user.payments.length > 0 ? (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Ref</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.payments.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>₹{p.amount}</td>
                        <td>{p.method}</td>
                        <td style={{ color: "var(--admin-text-muted)", fontSize: 12 }}>{p.reference || "—"}</td>
                        <td>
                          <span className={`admin-badge ${p.status?.toLowerCase()}`}>{p.status}</span>
                        </td>
                        <td style={{ color: "var(--admin-text-muted)", fontSize: 12 }}>
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="admin-empty">
                  <IndianRupee size={32} />
                  <p>No payments recorded</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title"><Activity size={14} style={{ marginRight: 6, display: "inline" }} />Recent Audit Log</span>
            </div>
            <div className="admin-timeline">
              {user.auditLogs && user.auditLogs.length > 0 ? (
                user.auditLogs.map((log) => (
                  <div className="admin-timeline-item" key={log.id}>
                    <div className="admin-timeline-dot" />
                    <div>
                      <div className="admin-timeline-action">{log.action}</div>
                      <div className="admin-timeline-meta">
                        {new Date(log.createdAt).toLocaleString()} · by {log.adminId?.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="admin-empty">
                  <Activity size={28} />
                  <p>No audit events</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
