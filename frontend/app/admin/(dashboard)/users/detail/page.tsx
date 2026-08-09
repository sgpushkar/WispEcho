import { Suspense } from "react";
import UserDetailPageClient from "./UserDetailPageClient";

export function generateStaticParams() {
  return [];
}

export default function UserDetailPage() {
  return (
    <Suspense fallback={<div className="admin-loading"><div className="admin-spinner" /></div>}>
      <UserDetailPageClient />
    </Suspense>
  );
}
