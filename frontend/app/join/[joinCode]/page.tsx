import { Suspense } from "react";
import JoinGroupClient from "./JoinGroupClient";

export function generateStaticParams() {
  return [{ joinCode: "_" }];
}

export default function JoinGroupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      }
    >
      <JoinGroupClient />
    </Suspense>
  );
}
