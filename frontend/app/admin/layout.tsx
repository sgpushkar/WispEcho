import type { Metadata } from "next";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import "@/app/admin.css";

export const metadata: Metadata = {
  title: "WispEcho Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-main">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
