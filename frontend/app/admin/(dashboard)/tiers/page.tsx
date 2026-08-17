"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi as api } from "@/lib/adminApi";
import { Star, Plus, Edit, Trash2 } from "lucide-react";

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  features: any;
  isActive: boolean;
}

export default function TiersPage() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/tiers");
      setTiers(res.data.tiers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tier permanently?")) return;
    try {
      await api.delete(`/admin/tiers/${id}`);
      fetchTiers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete tier");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Subscription Tiers</h1>
        <p className="admin-page-sub">Manage premium pricing and features.</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header flex justify-between items-center">
          <h2 className="admin-card-title flex items-center gap-2">
            <Star size={18} /> Pricing Tiers
          </h2>
          <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => alert("Create tier UI coming soon")}>
            <Plus size={14} /> New Tier
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tier Name</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Status</th>
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
              ) : tiers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                    No subscription tiers found
                  </td>
                </tr>
              ) : (
                tiers.map((tier) => (
                  <tr key={tier.id}>
                    <td className="font-medium text-white">{tier.name}</td>
                    <td>{tier.price} {tier.currency}</td>
                    <td className="text-[var(--admin-text-muted)] text-sm">{tier.durationDays} days</td>
                    <td>
                      <span className={`admin-badge ${tier.isActive ? "super_admin" : "user"}`}>
                        {tier.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition" onClick={() => alert("Edit UI coming soon")}>
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(tier.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
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
