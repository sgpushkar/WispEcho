"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.03),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.02),transparent_40%)]" />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative z-10 w-full max-w-sm rounded-[32px] p-8 glass-strong shadow-[0_24px_80px_rgba(0,0,0,0.6)] border-[1px] border-white/10 bg-white/[0.04]"
      >
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="WispEcho" className="h-16 w-auto rounded-2xl shadow-lg border border-white/10" />
        </div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white text-center">let's get you in</h1>
        <p className="mb-6 text-[13px] text-white/50 text-center">takes like 10 seconds fr</p>

        <div className="space-y-3">
          <input
            placeholder="display name"
            required
            value={form.displayName}
            onChange={(e) => update("displayName", e.target.value)}
            className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-sm outline-none transition-all duration-200 hover:bg-white/[0.07] focus:bg-white/[0.08] focus:border-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] placeholder-white/30 focus:placeholder-white/10"
          />
          <input
            placeholder="username"
            required
            value={form.username}
            onChange={(e) => update("username", e.target.value.toLowerCase())}
            className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-sm outline-none transition-all duration-200 hover:bg-white/[0.07] focus:bg-white/[0.08] focus:border-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] placeholder-white/30 focus:placeholder-white/10"
          />
          <input
            type="email"
            placeholder="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3.5 text-sm outline-none transition-all duration-200 hover:bg-white/[0.07] focus:bg-white/[0.08] focus:border-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] placeholder-white/30 focus:placeholder-white/10"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="password (8+ chars)"
              required
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full rounded-2xl border border-white/5 bg-white/5 pl-4 pr-10 py-3.5 text-sm outline-none transition-all duration-200 hover:bg-white/[0.07] focus:bg-white/[0.08] focus:border-white/20 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)] placeholder-white/30 focus:placeholder-white/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
              )}
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-white text-[#0a0a0a] py-3.5 text-[14px] font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50"
        >
          {loading ? "creating..." : "create account"}
        </motion.button>

        <GoogleSignInButton mode="register" />

        <p className="mt-4 text-center text-sm text-white/50">
          already have one?{" "}
          <Link href="/login" className="text-accent-soft hover:underline">
            log in
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
