"use client";

import { Download } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function InstallAppButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.a
        href="/downloads/wispecho.apk"
        download
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink)] shadow-xl hover:bg-white/10 transition border border-white/10"
        style={{ background: "var(--glass-bg-strong)", backdropFilter: "blur(12px)" }}
      >
        <Download size={14} className="text-[var(--ink)]" />
        <span className="hidden sm:inline">Install App</span>
      </motion.a>
    </div>
  );
}
