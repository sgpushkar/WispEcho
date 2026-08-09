"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHasHydrated } from "@/store/useAuthStore";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "SUPPORT"];

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const hydrated = useHasHydrated();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }
    if (!user.role || !ADMIN_ROLES.includes(user.role)) {
      router.replace("/");
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
