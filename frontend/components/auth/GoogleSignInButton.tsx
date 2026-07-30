"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({ mode }: { mode?: "login" | "register" }) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  // Set password modal state (shown after new Google signup)
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [pendingCreds, setPendingCreds] = useState<{ user: any; accessToken: string; refreshToken: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [isNative, setIsNative] = useState(true); // default true to prevent flash

  useEffect(() => {
    import("@capacitor/core")
      .then(({ Capacitor }) => setIsNative(Capacitor.isNativePlatform()))
      .catch(() => setIsNative(false));
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });

      if (buttonRef.current) {
        window.google?.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 352,
          logo_alignment: "center",
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  async function handleGoogleResponse(response: { credential: string }) {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/google", {
        idToken: response.credential,
        mode,
      });

      if (data.isNewUser && !data.hasPassword) {
        // New Google-only account — prompt to set a password before entering the app
        setPendingCreds({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
        setShowSetPassword(true);
      } else {
        setAuth(data.user, data.accessToken, data.refreshToken, data.isNewUser);
        router.push("/chat");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Google sign-in failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(skip = false) {
    if (!pendingCreds) return;

    if (!skip) {
      setPwError(null);
      if (newPassword.length < 8) {
        setPwError("Password must be at least 8 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPwError("Passwords don't match");
        return;
      }
      setPwLoading(true);
      try {
        await api.post(
          "/auth/set-password",
          { password: newPassword },
          { headers: { Authorization: `Bearer ${pendingCreds.accessToken}` } }
        );
      } catch (err: any) {
        setPwError(err.response?.data?.error || "Failed to set password");
        setPwLoading(false);
        return;
      }
      setPwLoading(false);
    }

    setAuth(pendingCreds.user, pendingCreds.accessToken, pendingCreds.refreshToken, true);
    setShowSetPassword(false);
    router.push("/chat");
  }

  return (
    <div className="w-full">
      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/30 select-none">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Google button container */}
      <div className="flex justify-center">
        {!isNative ? (
          <div ref={buttonRef} className="google-btn-wrapper w-full [&>div]:!w-full" />
        ) : (
          <p className="text-xs text-white/40 text-center py-2">
            Google Sign-in is web-only for now. Please use Email/Password.
          </p>
        )}
      </div>

      {loading && (
        <p className="mt-2 text-center text-xs text-white/40 animate-pulse">signing you in with google...</p>
      )}
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}

      {/* Set Password Modal — shown after new Google signup */}
      <AnimatePresence>
        {showSetPassword && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#111] p-7 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Lock size={18} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-[15px]">Set a password</h2>
                  <p className="text-white/40 text-[11px]">Optional — you can skip this and use Google to sign in</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition"
                />
              </div>

              {pwError && <p className="mt-2 text-xs text-red-400">{pwError}</p>}

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => handleSetPassword(true)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm text-white/60 hover:bg-white/10 hover:text-white transition"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => handleSetPassword(false)}
                  disabled={pwLoading}
                  className="flex-1 rounded-2xl bg-white py-3 text-sm font-semibold text-black hover:bg-white/90 transition disabled:opacity-50"
                >
                  {pwLoading ? "Saving..." : "Set Password"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
