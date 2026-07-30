"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHasHydrated } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Smartphone, Globe, Eye, Bell, Image as ImageIcon,
  Zap, Shield, ArrowRight, Lock, Sparkles, Plus, Minus,
} from "lucide-react";

/* ─── data ─── */
const features = [
  { icon: Zap,          title: "Instant Delivery",       desc: "Websocket-powered messaging." },
  { icon: Eye,          title: "View Once Media",        desc: "Self-destructing photo sharing." },
  { icon: ImageIcon,    title: "Rich Media",             desc: "CDN uploads with progress tracking." },
  { icon: Bell,         title: "Push Notifications",     desc: "Native alerts on Android & Web." },
];

/* ─── components ─── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-white/90 hover:text-white transition"
      >
        <span>{question}</span>
        <div className="h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 shrink-0 ml-4">
          {open ? <Minus size={12} /> : <Plus size={12} />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/5"
          >
            <p className="px-5 py-4 text-xs text-white/50 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── main page ─── */
export default function LandingPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useHasHydrated();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    import("@capacitor/core").then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) {
        if (hydrated) {
          router.replace(accessToken ? "/chat" : "/login");
        }
        return;
      }
      setShowLanding(true);
    }).catch(() => setShowLanding(true));
  }, [hydrated, accessToken, router]);

  if (!showLanding) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-start p-6 text-white selection:bg-white/20 selection:text-white bg-[#0a0a0a]">

      {/* Top Navbar */}
      <nav className="w-full max-w-xl flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="WispEcho Logo" className="h-8 w-8 rounded-[12px] shadow-[0_0_20px_rgba(255,255,255,0.15)] border border-white/10" />
          <span className="font-extrabold font-space tracking-tight text-lg">WispEcho</span>
        </div>
        <div>
          {accessToken ? (
            <Link href="/chat">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition border border-white/10 cursor-pointer"
              >
                <span>Open App</span>
                <ArrowRight size={14} />
              </motion.div>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <span className="text-xs font-medium text-white/60 hover:text-white px-3 py-2 transition">Sign In</span>
              </Link>
              <Link href="/register">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition border border-white/10 cursor-pointer"
                >
                  <span>Get Started</span>
                </motion.div>
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="w-full max-w-xl flex flex-col items-center text-center space-y-8 py-8">

        {/* Brand Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/5 text-[11px] font-medium text-white/80 backdrop-blur-md">
            <Sparkles size={11} className="text-accent" />
            <span>Next-Gen Encrypted Messaging</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-space bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent leading-tight">
              WispEcho
            </h1>
            <p className="text-sm text-white/50 max-w-md mx-auto leading-relaxed">
              Real-time messaging, but make it premium. View Once media, instant notifications, and sleek glassmorphic UI.
            </p>
          </div>
        </motion.div>

        {/* Hero Card with Actions */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass w-full rounded-[32px] p-6 border border-white/10 flex flex-col items-center text-center space-y-6"
        >
          <div className="w-full space-y-3">
            <Link href="/register">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-black py-4 font-bold text-sm tracking-wide shadow-lg cursor-pointer"
              >
                <Globe size={18} />
                <span>START ON WEB — FREE</span>
              </motion.div>
            </Link>

            <Link href="/download">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 text-white py-4 font-semibold text-sm tracking-wide hover:bg-white/10 transition cursor-pointer"
              >
                <Smartphone size={18} />
                <span>DOWNLOAD ANDROID APP (APK)</span>
              </motion.div>
            </Link>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 w-full text-left pt-2 border-t border-white/5">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
              <Zap size={16} className="text-white/60 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase font-medium">Speed</span>
                <span className="text-[11px] font-bold">WebSocket Instant</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
              <Shield size={16} className="text-white/60 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase font-medium">Privacy</span>
                <span className="text-[11px] font-bold">View Once & Zero Ads</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass w-full rounded-[32px] p-6 border border-white/10 space-y-4 text-left"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-space text-white">Features</h2>
            <p className="text-xs text-white/40">Clean, simple, private messaging</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {features.map((f) => (
              <div key={f.title} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                <f.icon size={18} className="text-white/70 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-white">{f.title}</h3>
                  <p className="text-[11px] text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Accordion Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass w-full rounded-[32px] p-6 border border-white/10 space-y-4 text-left"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-space text-white">FAQ</h2>
          </div>

          <div className="space-y-3 pt-2">
            <FaqItem
              question="Is WispEcho free to use?"
              answer="Yes! WispEcho is 100% free with no subscription tiers or ads."
            />
            <FaqItem
              question="How do View Once photos work?"
              answer="When you send a photo with View Once enabled, the recipient can tap to view it once. Once opened or closed, it's permanently deleted."
            />
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="pt-6 border-t border-white/5 w-full flex flex-col items-center space-y-2 text-[11px] text-white/30">
          <p>© 2026 WispEcho · Built for the next generation</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-white/60 transition">Sign In</Link>
            <Link href="/register" className="hover:text-white/60 transition">Register</Link>
            <Link href="/download" className="hover:text-white/60 transition">Download APK</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
