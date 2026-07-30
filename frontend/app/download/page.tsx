"use client";

import { Download, ArrowLeft, Shield, Cpu, Sparkles, ArrowUpCircle, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    new: string[];
    improved: string[];
    fixed: string[];
  };
}

interface VersionData {
  latestVersion: string;
  downloadUrl: string;
  releaseDate: string | null;
  changelog: ChangelogEntry[];
}

export default function DownloadPage() {
  const [data, setData] = useState<VersionData>({
    latestVersion: "1.2.0",
    downloadUrl: "https://github.com/sgpushkar/WispEcho/releases/download/latest/WispEcho-latest.apk",
    releaseDate: null,
    changelog: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const url = baseUrl ? `${baseUrl}/version.json?t=${Date.now()}` : `/version.json?t=${Date.now()}`;

    fetch(url)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((json) => {
        setData({
          latestVersion: json.latestVersion || json.version || "1.2.0",
          downloadUrl: json.downloadUrl || "https://wispecho.onrender.com/downloads/wispecho.apk",
          releaseDate: json.releaseDate || null,
          changelog: json.changelog || [],
        });
      })
      .catch((err) => console.error("Failed to load version details:", err))
      .finally(() => setLoading(false));
  }, []);

  const latestChanges = data.changelog[0]?.changes;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Latest Release";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

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
            <span className="text-4xl font-black font-space tracking-tight">v{data.latestVersion}</span>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/40">
              <Calendar size={10} />
              <span>{formatDate(data.releaseDate)}</span>
            </div>
          </div>

          {/* Download Button */}
          <motion.a
            href={data.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
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

        {/* Dynamic Changelog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="w-full text-left space-y-4"
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider pl-2">
            What's New in v{data.latestVersion}
          </h2>

          {latestChanges ? (
            <div className="space-y-3">
              {/* New Features */}
              {latestChanges.new?.length > 0 && (
                <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-violet-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">New</span>
                  </div>
                  <div className="space-y-2">
                    {latestChanges.new.map((item, i) => (
                      <p key={i} className="text-xs text-white/60 leading-relaxed pl-5">• {item}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Improved */}
              {latestChanges.improved?.length > 0 && (
                <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle size={13} className="text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Improved</span>
                  </div>
                  <div className="space-y-2">
                    {latestChanges.improved.map((item, i) => (
                      <p key={i} className="text-xs text-white/60 leading-relaxed pl-5">• {item}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Fixed */}
              {latestChanges.fixed?.length > 0 && (
                <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-[13px]">✓</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">Fixed</span>
                  </div>
                  <div className="space-y-2">
                    {latestChanges.fixed.map((item, i) => (
                      <p key={i} className="text-xs text-white/60 leading-relaxed pl-5">• {item}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Fallback: static release notes if API fails */
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: "Preloaded Chats", desc: "Instant switching between chats with zero load times." },
                { title: "Optimized Navigation", desc: "Smart system back button handling for native mobile gestures." },
                { title: "Fluid Performance", desc: "Silky smooth glassmorphism with optimized virtual scrolling." },
                { title: "Custom Themes", desc: "Ultra-premium dark and light mode system aesthetics." },
              ].map((note, index) => (
                <div key={index} className="glass p-5 rounded-2xl border border-white/5 flex flex-col space-y-1 hover:border-white/10 transition-colors">
                  <h3 className="text-sm font-semibold text-white">{note.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{note.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Previous Versions (if more than one changelog entry) */}
          {data.changelog.length > 1 && (
            <div className="pt-4 space-y-3">
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider pl-2">
                Previous Versions
              </h2>
              {data.changelog.slice(1).map((entry, idx) => (
                <div key={idx} className="glass p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/70">v{entry.version}</span>
                    <span className="text-[10px] text-white/30">{formatDate(entry.date)}</span>
                  </div>
                  <div className="space-y-1">
                    {entry.changes.new?.map((item, i) => (
                      <p key={`n-${i}`} className="text-[11px] text-white/40 pl-3">+ {item}</p>
                    ))}
                    {entry.changes.improved?.map((item, i) => (
                      <p key={`i-${i}`} className="text-[11px] text-white/40 pl-3">↑ {item}</p>
                    ))}
                    {entry.changes.fixed?.map((item, i) => (
                      <p key={`f-${i}`} className="text-[11px] text-white/40 pl-3">✓ {item}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
