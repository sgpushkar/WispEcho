"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

type State = "verifying" | "success" | "error" | "missing";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>(token ? "verifying" : "missing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setState("missing");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await api.post("/auth/verify-email", { token });
        if (!cancelled) setState("success");
      } catch (err: any) {
        if (!cancelled) {
          setState("error");
          setErrorMsg(err.response?.data?.error || "Verification failed. The link may have expired.");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] p-6 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass w-full max-w-sm rounded-[28px] border border-white/10 p-8 flex flex-col items-center text-center space-y-6"
      >
        {state === "verifying" && (
          <>
            <Loader2 size={48} className="text-white/50 animate-spin" />
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Verifying your email…</h1>
              <p className="text-sm text-white/40">This will only take a moment.</p>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle size={56} className="text-green-400" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Email verified! 🎉</h1>
              <p className="text-sm text-white/50">
                Your email has been confirmed. You can now use all features of WispEcho.
              </p>
            </div>
            <Link href="/chat">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-black py-3 px-6 font-bold text-sm tracking-wide cursor-pointer"
              >
                Go to Chat
              </motion.div>
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle size={56} className="text-red-400" />
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Verification failed</h1>
              <p className="text-sm text-white/50">{errorMsg}</p>
            </div>
            <Link href="/login">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/10 text-white py-3 px-6 font-semibold text-sm cursor-pointer hover:bg-white/20 transition"
              >
                Back to Sign In
              </motion.div>
            </Link>
          </>
        )}

        {state === "missing" && (
          <>
            <Mail size={48} className="text-white/40" />
            <div>
              <h1 className="text-xl font-bold text-white mb-2">No verification token</h1>
              <p className="text-sm text-white/50">
                This link is invalid or incomplete. Please use the link from your verification email.
              </p>
            </div>
            <Link href="/login">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/10 text-white py-3 px-6 font-semibold text-sm cursor-pointer hover:bg-white/20 transition"
              >
                Back to Sign In
              </motion.div>
            </Link>
          </>
        )}

        {/* Brand watermark */}
        <div className="flex items-center gap-2 pt-4 border-t border-white/5 w-full justify-center">
          <img src="/logo.png" alt="WispEcho" className="h-5 w-5 rounded-md opacity-60" />
          <span className="text-xs text-white/30 font-semibold">WispEcho</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
