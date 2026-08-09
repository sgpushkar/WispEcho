"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Crown, IndianRupee, Activity, TrendingUp } from "lucide-react";
import { adminApi as api } from "@/lib/adminApi";

interface Stats {
  totalUsers: number;
  activeProUsers: number;
  totalRevenueINR: number;
  pendingPayments?: { id: string; userId: string; amount: number; createdAt: string; user: { username: string; displayName: string } }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/dashboard")
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? "—",
      icon: Users,
      colorClass: "purple",
    },
    {
      label: "Active Pro",
      value: stats?.activeProUsers ?? "—",
      icon: Crown,
      colorClass: "green",
    },
    {
      label: "Total Revenue",
      value: stats ? `₹${stats.totalRevenueINR.toLocaleString("en-IN")}` : "—",
      icon: IndianRupee,
      colorClass: "amber",
    },
    {
      label: "Conversion Rate",
      value: stats
        ? `${((stats.activeProUsers / (stats.totalUsers || 1)) * 100).toFixed(1)}%`
        : "—",
      icon: TrendingUp,
      colorClass: "blue",
    },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-sub">Overview of WispEcho platform metrics</p>
      </div>

      {loading ? (
        <div className="admin-stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-stat-card" style={{ opacity: 0.4, minHeight: 90 }} />
          ))}
        </div>
      ) : (
        <div className="admin-stats-grid">
          {statCards.map(({ label, value, icon: Icon, colorClass }) => (
            <div key={label} className="admin-stat-card">
              <div className={`admin-stat-icon ${colorClass}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="admin-stat-label">{label}</p>
                <p className="admin-stat-value">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {stats?.pendingPayments && stats.pendingPayments.length > 0 && (
        <div className="admin-card" style={{ marginBottom: 24, border: "1px solid var(--admin-warning)" }}>
          <div className="admin-card-header">
            <span className="admin-card-title">Action Required: Pending Payment Claims</span>
            <span className="admin-badge gray">{stats.pendingPayments.length} claims</span>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Claimed At</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.pendingPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[13px]">{p.user.displayName}</span>
                        <span className="text-[11px] text-gray-500">@{p.user.username}</span>
                      </div>
                    </td>
                    <td>₹{p.amount}</td>
                    <td>{new Date(p.createdAt).toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/admin/users/detail?id=${p.userId}`} className="admin-btn admin-btn-primary admin-btn-sm inline-flex">
                        Verify & Grant
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">Quick Actions</span>
        </div>
        <div style={{ padding: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/users" className="admin-btn admin-btn-primary">
            <Users size={15} /> Manage Users
          </Link>
          <Link href="/admin/payments" className="admin-btn admin-btn-secondary">
            <IndianRupee size={15} /> Record Payment
          </Link>
          <Link href="/admin/audit-logs" className="admin-btn admin-btn-secondary">
            <Activity size={15} /> Audit Logs
          </Link>
        </div>
      </div>
    </div>
  );
}
