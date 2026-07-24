"use client";

import { useState, useEffect } from "react";
import { Download, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CURRENT_VERSION = "1.0.0"; // Local app version

export function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<{ version: string; downloadUrl: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isCapacitor = (window as any).Capacitor;
    // Only run update check inside the native Capacitor app wrapper
    if (!isCapacitor) return;

    async function checkVersion() {
      try {
        // Fetch version from the hosted web server
        const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "https://wispecho.onrender.com";
        const res = await fetch(`${baseUrl}/version.json?t=${Date.now()}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.version && isNewerVersion(data.version, CURRENT_VERSION)) {
          setUpdateInfo(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Failed to check app version:", err);
      }
    }

    checkVersion();
  }, []);

  function isNewerVersion(remote: string, local: string) {
    const parse = (v: string) => v.replace(/[vr]/g, "").split(".").map(Number);
    const r = parse(remote);
    const l = parse(local);

    for (let i = 0; i < Math.max(r.length, l.length); i++) {
      const rNum = r[i] || 0;
      const lNum = l[i] || 0;
      if (rNum > lNum) return true;
      if (rNum < lNum) return false;
    }
    return false;
  }

  const handleInstall = () => {
    if (updateInfo?.downloadUrl) {
      window.open(updateInfo.downloadUrl, "_system");
      setIsOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && updateInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass max-w-sm w-full rounded-[32px] p-6 border border-white/10 flex flex-col items-center text-center space-y-4"
          >
            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <Download size={22} className="text-white" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">Update Available</h3>
              <p className="text-xs text-white/50">
                A new version of WispEcho is available. Install it now to get the latest features.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/5 rounded-2xl px-4 py-2 border border-white/5 text-xs text-white/70">
              <span className="opacity-50">Local: v{CURRENT_VERSION}</span>
              <span className="opacity-30">|</span>
              <span className="font-semibold text-white">Latest: v{updateInfo.version}</span>
            </div>

            <div className="flex w-full gap-3 pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-2xl bg-white/5 border border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-white/80 hover:bg-white/10 transition"
              >
                Later
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 rounded-2xl bg-white text-black py-3 text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition"
              >
                Install Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
