import UserDetailPageClient from "./UserDetailPageClient";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function UserDetailPage() {
  return <UserDetailPageClient />;
}
