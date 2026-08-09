"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, IndianRupee, Crown, Search, Users } from "lucide-react";
import { adminApi as api } from "@/lib/adminApi";

interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
  user?: { username: string; email: string; displayName: string };
}

function RecordPaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [grantDays, setGrantDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!search) { setUsers([]); return; }
    const t = setTimeout(async () => {
      const { data } = await api.get("/admin/users", { params: { search, limit: 5 } });
      setUsers(data.users);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSubmit = async () => {
    if (!selectedUser) { setError("Select a user"); return; }
    if (!amount || isNaN(Number(amount))) { setError("Enter a valid amount"); return; }
    setLoading(true); setError("");
    try {
      await api.post("/admin/payments/record", {
        userId: selectedUser.id,
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
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="admin-modal-title"><IndianRupee size={18} style={{ color: "var(--admin-accent)" }} /> Record Manual Payment</h3>

        <div className="admin-form-group">
          <label>User *</label>
          {selectedUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--admin-surface-2)", borderRadius: 8, border: "1px solid var(--admin-border)" }}>
              <span style={{ fontSize: 13 }}>{selectedUser.displayName} (@{selectedUser.username})</span>
              <button onClick={() => setSelectedUser(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--admin-text-muted)" }}>✕</button>
            </div>
          ) : (
            <div>
              <input className="admin-input" placeholder="Search user by email or username…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {users.length > 0 && (
                <div style={{ background: "var(--admin-surface-2)", border: "1px solid var(--admin-border)", borderRadius: 8, marginTop: 4 }}>
                  {users.map((u) => (
                    <div key={u.id} onClick={() => { setSelectedUser(u); setUsers([]); setSearch(""); }}
                      style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--admin-border)" }}>
                      {u.displayName} · <span style={{ color: "var(--admin-text-muted)" }}>{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>Amount (INR) *</label>
            <input className="admin-input" type="number" placeholder="e.g. 149" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label>Method</label>
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
          <input className="admin-input" placeholder="UPI Transaction ID / UTR" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>

        <div className="admin-form-group">
          <label>Grant Pro for (days)</label>
          <select className="admin-select" value={grantDays} onChange={(e) => setGrantDays(e.target.value)}>
            <option value="0">Don't grant Pro</option>
            <option value="30">30 days (monthly)</option>
            <option value="90">90 days (quarterly)</option>
            <option value="180">180 days</option>
            <option value="365">365 days (yearly)</option>
            <option value="36500">Lifetime</option>
          </select>
        </div>

        <div className="admin-form-group">
          <label>Notes (optional)</label>
          <input className="admin-input" placeholder="Any admin notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p style={{ color: "var(--admin-danger)", fontSize: 13, marginBottom: 8 }}>{error}</p>}

        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="admin-btn admin-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Recording…" : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // We'll need to add a payments endpoint — use audit logs as fallback for now
      // and get payments from the admin users search
      const { data } = await api.get("/admin/audit-logs", { params: { limit: 50 } });
      setPayments([]); // payments will come from the dedicated endpoint we'll add
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div>
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>}
      {modal && (
        <RecordPaymentModal
          onClose={() => setModal(false)}
          onSuccess={() => { fetchPayments(); showToast("Payment recorded!", "success"); }}
        />
      )}

      <div className="admin-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="admin-page-title">Payments</h1>
          <p className="admin-page-sub">Record and manage manual UPI payments</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Record Payment
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title"><Crown size={14} style={{ marginRight: 6, display: "inline" }} />Payment Records</span>
        </div>
        <div className="admin-empty" style={{ padding: "60px 20px" }}>
          <IndianRupee size={40} />
          <p style={{ fontWeight: 600 }}>No standalone payments page yet</p>
          <p style={{ fontSize: 13 }}>Use "Record Payment" to record UPI transactions. View payment history on each user's detail page.</p>
          <a href="/admin/users" className="admin-btn admin-btn-primary" style={{ marginTop: 8 }}>
            <Users size={15} /> Browse Users
          </a>
        </div>
      </div>
    </div>
  );
}
