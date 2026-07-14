"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

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

export default function GoogleSignInButton() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    // Load the Google Identity Services script
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

    return () => {
      // Cleanup handled by React
    };
  }, []);

  async function handleGoogleResponse(response: { credential: string }) {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/google", {
        idToken: response.credential,
      });
      setAuth(data.user, data.accessToken, data.isNewUser);
      router.push("/chat");
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Google sign-in failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/30 select-none">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Google button container — GSI renders inside this div */}
      <div className="flex justify-center">
        <div
          ref={buttonRef}
          className="google-btn-wrapper w-full [&>div]:!w-full"
        />
      </div>

      {loading && (
        <p className="mt-2 text-center text-xs text-white/40 animate-pulse">
          signing you in with google...
        </p>
      )}

      {error && (
        <p className="mt-2 text-center text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
