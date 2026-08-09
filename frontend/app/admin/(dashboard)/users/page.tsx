"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Crown, UserCheck, ExternalLink } from "lucide-react";
import { adminApi as api } from "@/lib/adminApi";

interface UserRow {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  isPro: boolean;
  createdAt: string;
  lastSeen: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users", {
        params: { search, page, limit },
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);

  const roleBadgeClass = (role: string) => {
    const r = role?.toLowerCase();
    if (r === "super_admin") return "super_admin";
    if (r === "admin") return "admin";
    if (r === "moderator") return "moderator";
    return "user";
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Users</h1>
        <p className="admin-page-sub">{total} total users registered</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-search-bar">
            <Search size={15} style={{ color: "var(--admin-text-muted)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by email or username…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Plan</th>
                <th>Joined</th>
                <th>Last Seen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar-sm">
                          <span>{u.displayName?.[0]?.toUpperCase() || "?"}</span>
                        </div>
                        <div className="admin-user-cell-info">
                          <div className="name">{u.displayName}</div>
                          <div className="email">@{u.username} · {u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${roleBadgeClass(u.role)}`}>
                        {u.role?.replace("_", " ") || "USER"}
                      </span>
                    </td>
                    <td>
                      {u.isPro ? (
                        <span className="admin-badge pro"><Crown size={10} /> Pro</span>
                      ) : (
                        <span className="admin-badge free">Free</span>
                      )}
                    </td>
                    <td style={{ color: "var(--admin-text-muted)", fontSize: 12 }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ color: "var(--admin-text-muted)", fontSize: 12 }}>
                      {new Date(u.lastSeen).toLocaleDateString()}
                    </td>
                    <td>
                      <Link href={`/admin/users/${u.id}`} className="admin-btn admin-btn-secondary admin-btn-sm">
                        <ExternalLink size={12} /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-pagination">
            <span>{total} users · Page {page} of {totalPages}</span>
            <button
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
