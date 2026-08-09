"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ScrollText,
  LogOut,
  ShieldCheck,
  Zap,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className="admin-sidebar">
      {/* Logo */}
      <div className="admin-sidebar-logo">
        <ShieldCheck size={22} className="admin-logo-icon" />
        <div>
          <span className="admin-logo-title">WispEcho</span>
          <span className="admin-logo-sub">Admin Panel</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="admin-nav">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`admin-nav-item${isActive ? " active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {isActive && <ChevronRight size={14} className="admin-nav-arrow" />}
            </Link>
          );
        })}
      </nav>

      {/* User Badge */}
      <div className="admin-sidebar-footer">
        <div className="admin-user-badge">
          <div className="admin-user-avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} />
            ) : (
              <span>{user?.displayName?.[0]?.toUpperCase() || "A"}</span>
            )}
          </div>
          <div className="admin-user-info">
            <span className="admin-user-name">{user?.displayName}</span>
            <span className="admin-user-role">
              <Zap size={10} />
              {user?.role?.replace("_", " ")}
            </span>
          </div>
        </div>
        <button onClick={handleLogout} className="admin-logout-btn" title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
