"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuthStore, useAdminHasHydrated } from "@/store/useAdminAuthStore";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "SUPPORT"];

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAdminAuthStore();
  const hydrated = useAdminHasHydrated();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/admin/login");
      return;
    }
    if (!user.role || !ADMIN_ROLES.includes(user.role)) {
      router.replace("/admin/login");
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated || !isAuthenticated || !user || !user.role || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <p>Verifying access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
