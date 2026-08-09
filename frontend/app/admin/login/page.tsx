"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { adminApi } from "@/lib/adminApi";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { ShieldCheck } from "lucide-react";
import "@/app/admin.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const setAuth = useAdminAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await adminApi.post("/auth/login", { email, password });
      
      // Basic check, if they are not an admin role we can optionally throw an error here too
      const role = data.user.role;
      if (!role || !["SUPER_ADMIN", "ADMIN", "MODERATOR", "SUPPORT"].includes(role)) {
        throw new Error("Access Denied: You do not have admin privileges.");
      }

      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push("/admin");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black px-4 overflow-hidden" style={{ background: "var(--admin-bg)" }}>
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(124,58,237,0.1),transparent_50%)]" />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative z-10 w-full max-w-sm rounded-[24px] p-8 border border-white/10"
        style={{ background: "var(--admin-card)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
      >
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl border border-white/10 bg-white/5">
            <ShieldCheck size={32} className="text-[#a78bfa]" />
          </div>
        </div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-center text-white">Admin Portal</h1>
        <p className="mb-8 text-[13px] text-center text-white/50">Restricted access area</p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Admin Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all duration-200 hover:bg-white/10 focus:bg-white/10 focus:border-[#7c3aed]/50 focus:shadow-[0_0_15px_rgba(124,58,237,0.1)] placeholder-white/30"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-white/5 pl-4 pr-10 py-3 text-sm text-white outline-none transition-all duration-200 hover:bg-white/10 focus:bg-white/10 focus:border-[#7c3aed]/50 focus:shadow-[0_0_15px_rgba(124,58,237,0.1)] placeholder-white/30"
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

        {error && <p className="mt-4 text-center text-xs font-medium text-red-400">{error}</p>}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-[#7c3aed] text-white py-3 text-[14px] font-bold tracking-wide transition-all duration-200 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:bg-[#8b5cf6] disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Enter Portal"}
        </motion.button>
      </motion.form>
    </div>
  );
}
