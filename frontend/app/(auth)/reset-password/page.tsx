"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, CheckCircle, Eye, EyeOff, KeyRound, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      setState("error");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      setState("error");
      return;
    }

    setState("loading");
    try {
      await api.post("/auth/reset-password", { token, password });
      setState("success");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Reset failed. The link may have expired.");
      setState("error");
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] p-6 text-white">
        <div className="glass rounded-[28px] border border-white/10 p-8 max-w-sm w-full text-center space-y-4">
          <XCircle size={48} className="text-red-400 mx-auto" />
          <h1 className="text-xl font-bold">Invalid reset link</h1>
          <p className="text-sm text-white/50">This link is invalid or incomplete. Please request a new password reset.</p>
          <Link href="/login">
            <div className="mt-2 rounded-2xl bg-white/10 border border-white/10 px-6 py-3 text-sm font-semibold hover:bg-white/20 transition cursor-pointer">
              Back to Sign In
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] p-6 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass w-full max-w-sm rounded-[28px] border border-white/10 p-8 flex flex-col space-y-6"
      >
        {state === "success" ? (
          <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle size={56} className="text-green-400" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Password reset! 🎉</h1>
              <p className="text-sm text-white/50">
                Your password has been updated. You can now sign in with your new password.
              </p>
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/login")}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-black py-3 px-6 font-bold text-sm tracking-wide cursor-pointer"
            >
              Sign In
            </motion.div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <KeyRound size={18} className="text-white/60" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">Reset Password</h1>
                <p className="text-xs text-white/40">Enter your new password below</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-white/30" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setState("idle"); }}
                    placeholder="min. 8 characters"
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3.5 top-3.5 text-white/30 hover:text-white/60 transition"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-white/30" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setState("idle"); }}
                    placeholder="repeat new password"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3.5 top-3.5 text-white/30 hover:text-white/60 transition"
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {state === "error" && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5"
                >
                  {errorMsg}
                </motion.p>
              )}

              {/* Strength hint */}
              {password.length > 0 && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        password.length >= i * 4
                          ? i <= 1 ? "bg-red-400" : i <= 2 ? "bg-orange-400" : i <= 3 ? "bg-yellow-400" : "bg-green-400"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              )}

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={state === "loading"}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-black py-3 font-bold text-sm tracking-wide disabled:opacity-60 transition"
              >
                {state === "loading" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                ) : null}
                {state === "loading" ? "Resetting…" : "Reset Password"}
              </motion.button>
            </form>

            <div className="text-center">
              <Link href="/login" className="text-xs text-white/30 hover:text-white/60 transition">
                Remember your password? Sign in
              </Link>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5 justify-center">
              <div className="relative flex h-5 w-5 items-center justify-center rounded-md bg-white/10 overflow-hidden">
                <img src="/logo-dark.png" alt="WispEcho" className="h-3.5 w-auto object-contain logo-dark" />
                <img src="/logo-light.png" alt="WispEcho" className="h-3.5 w-auto object-contain logo-light" />
              </div>
              <span className="text-xs text-white/50 font-semibold">WispEcho</span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
