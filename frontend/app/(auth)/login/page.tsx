"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth(data.user, data.accessToken);
      router.push("/chat");
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-base px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.03),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.02),transparent_40%)]" />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative z-10 w-full max-w-sm rounded-[32px] p-8 glass-strong shadow-[0_24px_80px_rgba(0,0,0,0.6)] border-[1px] border-white/10 bg-white/[0.04]"
      >
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">welcome back</h1>
        <p className="mb-6 text-[13px] text-white/50">log in to keep the convo going</p>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-sm outline-none transition-all duration-200 hover:bg-white/[0.07] focus:bg-white/[0.08] focus:border-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] placeholder-white/30 focus:placeholder-white/10"
          />
          <input
            type="password"
            placeholder="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-sm outline-none transition-all duration-200 hover:bg-white/[0.07] focus:bg-white/[0.08] focus:border-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] placeholder-white/30 focus:placeholder-white/10"
          />
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-white text-[#0a0a0a] py-3.5 text-[14px] font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50"
        >
          {loading ? "logging in..." : "log in"}
        </motion.button>

        <GoogleSignInButton mode="login" />

        <p className="mt-4 text-center text-sm text-white/50">
          new here?{" "}
          <Link href="/register" className="text-accent-soft hover:underline">
            create an account
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
