"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.15),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.12),transparent_40%)]" />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="glass-strong relative z-10 w-full max-w-sm rounded-3xl p-8 shadow-2xl"
      >
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">let's get you in ✨</h1>
        <p className="mb-6 text-sm text-white/50">takes like 10 seconds fr</p>

        <div className="space-y-3">
          <input
            placeholder="display name"
            required
            value={form.displayName}
            onChange={(e) => update("displayName", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent/60"
          />
          <input
            placeholder="username"
            required
            value={form.username}
            onChange={(e) => update("username", e.target.value.toLowerCase())}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent/60"
          />
          <input
            type="email"
            placeholder="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent/60"
          />
          <input
            type="password"
            placeholder="password (8+ chars)"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent/60"
          />
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-accent to-pink-500 py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "creating..." : "create account"}
        </motion.button>

        <p className="mt-5 text-center text-sm text-white/50">
          already have one?{" "}
          <Link href="/login" className="text-accent-soft hover:underline">
            log in
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
