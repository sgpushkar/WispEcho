"use client";

import { Download, ArrowLeft, Shield, Cpu, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

import { useState, useEffect } from "react";

export default function DownloadPage() {
  const [version, setVersion] = useState("1.1.0");
  const [apkUrl, setApkUrl] = useState("/downloads/wispecho.apk");

  useEffect(() => {
    fetch(`/version.json?t=${Date.now()}`)
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.version) setVersion(data.version);
          if (data.apkUrl) setApkUrl(data.apkUrl);
        }
      })
      .catch((err) => console.error("Failed to load version details:", err));
  }, []);

  const releaseNotes = [
    { title: "Preloaded Chats", desc: "Instant switching between chats with zero load times." },
    { title: "Optimized Navigation", desc: "Smart system back button handling for native mobile gestures." },
    { title: "Fluid Performance", desc: "Silky smooth glassmorphism with optimized virtual scrolling." },
    { title: "Custom Themes", desc: "Ultra-premium dark and light mode system aesthetics." }
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center p-6 text-white selection:bg-white/20 selection:text-white">
      <div className="absolute top-6 left-6 z-50">
        <Link href="/chat">
          <motion.div
            whileHover={{ scale: 1.05, x: -3 }}
            whileTap={{ scale: 0.95 }}
            className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition border border-white/5 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Open Web App</span>
          </motion.div>
        </Link>
      </div>

      <div className="w-full max-w-xl flex flex-col items-center text-center space-y-8 py-12">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center space-y-4"
        >
          <img src="/logo.png" alt="WispEcho Logo" className="h-16 w-16 rounded-[20px] shadow-[0_0_50px_rgba(255,255,255,0.15)] border border-white/10" />
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight font-space bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
              WispEcho Mobile
            </h1>
            <p className="text-sm text-white/50 max-w-sm">
              Real-time messaging, but make it premium. Download the latest release for your device.
            </p>
          </div>
        </motion.div>

        {/* Main Glass Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="glass w-full rounded-[32px] p-6 border border-white/10 flex flex-col items-center text-center space-y-6"
        >
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/5 text-[11px] font-medium text-white/80">
            <Sparkles size={11} className="text-accent" />
            <span>Latest Stable Release</span>
          </div>

          <div className="space-y-1">
            <span className="text-4xl font-black font-space tracking-tight">v{version}</span>
            <p className="text-[11px] text-white/40">Released July 2026</p>
          </div>

          {/* Download Button */}
          <motion.a
            href={apkUrl}
            download
            whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-black py-4 font-bold text-sm tracking-wide shadow-lg hover:shadow-white/5 transition duration-300"
          >
            <Download size={16} />
            <span>DOWNLOAD FOR ANDROID (APK)</span>
          </motion.a>

          {/* App Specifications */}
          <div className="grid grid-cols-2 gap-3 w-full text-left pt-2 border-t border-white/5">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
              <Cpu size={16} className="text-white/60 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase font-medium">Architecture</span>
                <span className="text-[11px] font-bold">Universal / ARM64</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
              <Shield size={16} className="text-white/60 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase font-medium">Security</span>
                <span className="text-[11px] font-bold text-green-400">Verified Safe</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Release Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="w-full text-left space-y-4"
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider pl-2">
            What's New in v{version}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {releaseNotes.map((note, index) => (
              <div key={index} className="glass p-5 rounded-2xl border border-white/5 flex flex-col space-y-1 hover:border-white/10 transition-colors">
                <h3 className="text-sm font-semibold text-white">{note.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{note.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
