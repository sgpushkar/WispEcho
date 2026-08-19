"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHasHydrated } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Smartphone, Globe, Eye, Bell, Image as ImageIcon,
  Zap, Shield, ArrowRight, Users, Lock,
  Check, Sparkles, Phone, Video, Smile, Plus, Minus,
} from "lucide-react";

/* ─── data ─── */
const features = [
  { icon: Zap,          title: "Instant Delivery",       desc: "Messages land in milliseconds via Socket.io WebSockets." },
  { icon: Eye,          title: "View Once Media",        desc: "Photos that self-destruct after one view — zero traces." },
  { icon: ImageIcon,    title: "Rich Image Sharing",     desc: "Cloudinary CDN uploads with real-time progress tracking." },
  { icon: Bell,         title: "Push Notifications",     desc: "Native Android & web push alerts when you're away." },
  { icon: Shield,       title: "Privacy First",          desc: "No ads. No tracking. Your data stays completely yours." },
  { icon: Users,        title: "Group Chats",            desc: "Bring the whole squad together in real-time group rooms." },
  { icon: Lock,         title: "Google Sign-In",         desc: "One-tap secure login with automatic account linking." },
  { icon: Sparkles,     title: "Premium Themes",         desc: "Ultra-sleek glassmorphism dark & light visual styles." },
];

const steps = [
  { n: "01", title: "Create Your Account", desc: "Sign up with email or 1-tap Google — zero friction, 30 seconds." },
  { n: "02", title: "Connect With Friends", desc: "Search by username, add friends, or create group channels." },
  { n: "03", title: "Start Chatting",       desc: "Send texts, images, View Once media, and instant reactions." },
];

const mockMessages = [
  { mine: false, text: "yo did you see this app?? 🔥",           time: "2:40 PM" },
  { mine: true,  text: "yeah WispEcho is actually insane",        time: "2:41 PM" },
  { mine: false, text: "sending you something private 👀",       time: "2:41 PM", viewOnce: true },
  { mine: true,  text: "woah the view once photo self destructed!", time: "2:42 PM" },
];

/* ─── components ─── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden">
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
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-xs text-white/50 leading-relaxed border-t border-white/5 pt-3">
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
  const [visibleMsg, setVisibleMsg] = useState(0);

  useEffect(() => {
    import("@capacitor/core").then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) {
        if (hydrated) {
          router.replace(accessToken ? "/chat" : "/login");
        }
        return; // Don't show landing page if native, just wait for hydration
      }
      setShowLanding(true);
    }).catch(() => setShowLanding(true));
  }, [hydrated, accessToken, router]);

  useEffect(() => {
    if (visibleMsg >= mockMessages.length) return;
    const t = setTimeout(() => setVisibleMsg((v) => v + 1), 800);
    return () => clearTimeout(t);
  }, [visibleMsg]);

  if (!showLanding) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-start text-white selection:bg-white/20 selection:text-white bg-black">

      {/* Top Navbar */}
      <nav className="w-full max-w-6xl mx-auto flex items-center justify-between py-6 px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-[12px] bg-white/10 border border-white/15 shadow-[0_0_20px_rgba(255,255,255,0.15)] overflow-hidden">
            <img src="/logo-dark.png" alt="WispEcho Logo" className="h-5 w-auto object-contain logo-dark" />
            <img src="/logo-light.png" alt="WispEcho Logo" className="h-5 w-auto object-contain logo-light" />
          </div>
          <span className="font-extrabold font-space tracking-tight text-lg">WispEcho</span>
        </div>
        <div>
          {accessToken ? (
            <Link href="/chat">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/5 backdrop-blur-2xl flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition border border-white/10 cursor-pointer"
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
                  className="bg-white/5 backdrop-blur-2xl flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition border border-white/10 cursor-pointer"
                >
                  <span>Get Started</span>
                </motion.div>
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center space-y-20 py-12 md:py-20 px-6 lg:px-8">

        {/* Hero Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center w-full">
          {/* Brand Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center lg:items-start space-y-6 text-center lg:text-left"
          >
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/5 text-[11px] font-medium text-white/80 backdrop-blur-md">
              <Sparkles size={11} className="text-accent" />
              <span>Next-Gen Encrypted Messaging</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-space bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent leading-tight">
                WispEcho
              </h1>
              <p className="text-base sm:text-lg text-white/50 max-w-md mx-auto lg:mx-0 leading-relaxed">
                Real-time messaging, but make it premium. View Once media, instant notifications, and sleek glassmorphic UI.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md lg:max-w-none pt-4">
              <Link href="/register" className="w-full sm:w-auto flex-1">
                <motion.div
                  whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-black py-4 px-6 font-bold text-sm tracking-wide shadow-lg hover:shadow-white/5 transition duration-300 cursor-pointer"
                >
                  <Globe size={18} />
                  <span>START ON WEB</span>
                </motion.div>
              </Link>
              <Link href="/download" className="w-full sm:w-auto flex-1">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 text-white py-4 px-6 font-semibold text-sm tracking-wide hover:bg-white/10 transition duration-300 cursor-pointer"
                >
                  <Smartphone size={18} />
                  <span>ANDROID APP</span>
                </motion.div>
              </Link>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 gap-4 w-full text-left pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <Zap size={20} className="text-white/60 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/40 uppercase font-medium">Speed</span>
                  <span className="text-xs font-bold">WebSocket Instant</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <Shield size={20} className="text-white/60 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/40 uppercase font-medium">Privacy</span>
                  <span className="text-xs font-bold">Zero Ads & Trackers</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Live Interactive Chat Mockup Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white/5 backdrop-blur-2xl w-full max-w-md mx-auto lg:max-w-none rounded-[32px] p-6 sm:p-8 border border-white/10 text-left space-y-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">A</div>
                <div>
                  <p className="text-xs font-bold text-white">Alex</p>
                  <p className="text-[10px] text-green-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                    online
                  </p>
                </div>
              </div>
              <div className="flex gap-3 text-white/20">
                <Phone size={15} />
                <Video size={15} />
              </div>
            </div>

            <div className="space-y-2.5 min-h-[180px]">
            {mockMessages.slice(0, visibleMsg).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.mine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.mine
                    ? "bg-white text-black font-medium"
                    : "bg-white/10 text-white border border-white/5"
                }`}>
                  {msg.viewOnce ? (
                    <span className="flex items-center gap-1.5 text-violet-400">
                      <Eye size={12} />Photo · View Once
                    </span>
                  ) : msg.text}
                  <div className={`text-[9px] mt-1 ${msg.mine ? "text-black/40 text-right" : "text-white/30"}`}>{msg.time}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5">
            <Smile size={15} className="text-white/20 shrink-0" />
            <span className="text-xs text-white/20 flex-1">Message Alex…</span>
            <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowRight size={12} className="text-white/40" />
            </div>
          </div>
        </motion.div>
        </div>

        {/* Features Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/5 backdrop-blur-2xl w-full rounded-[32px] p-6 border border-white/10 space-y-4 text-left"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-space text-white">Features</h2>
            <p className="text-sm text-white/40">Everything built for modern conversations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {features.map((f) => (
              <div key={f.title} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3 hover:bg-white/[0.08] transition">
                <f.icon size={18} className="text-white/70 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-white">{f.title}</h3>
                  <p className="text-[11px] text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How It Works Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/5 backdrop-blur-2xl w-full rounded-[32px] p-6 border border-white/10 space-y-4 text-left"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-space text-white">How It Works</h2>
            <p className="text-sm text-white/40">Up and running in under 30 seconds</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {steps.map((s) => (
              <div key={s.n} className="p-6 rounded-[24px] bg-white/5 border border-white/5 flex flex-col gap-4">
                <span className="text-3xl font-black text-white/20 font-space">{s.n}</span>
                <div>
                  <h3 className="text-xs font-bold text-white">{s.title}</h3>
                  <p className="text-[11px] text-white/40 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Why WispEcho Checklist Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/5 backdrop-blur-2xl w-full rounded-[32px] p-6 border border-white/10 space-y-4 text-left"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-space text-white">Why WispEcho?</h2>
            <p className="text-sm text-white/40">Designed for smooth, simple, private messaging</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {[
              "100% free with zero ads or hidden paywalls",
              "View Once self-destructing photo sharing",
              "Real-time online presence & typing indicators",
              "Native Android app + Web app cross-compatibility",
              "Google 1-tap sign in with automatic account linking",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-white/80">
                <Check size={14} className="text-green-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Accordion Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/5 backdrop-blur-2xl w-full rounded-[32px] p-6 border border-white/10 space-y-4 text-left"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-space text-white">Frequently Asked Questions</h2>
            <p className="text-sm text-white/40">Quick answers to common questions</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
            <FaqItem
              question="Is WispEcho free to use?"
              answer="Yes! WispEcho is 100% free with no subscription tiers or ads."
            />
            <FaqItem
              question="How do View Once photos work?"
              answer="When you send a photo with View Once enabled, the recipient can tap to view it once. Once opened or closed, it's permanently deleted."
            />
            <FaqItem
              question="Can I use it on both mobile and web?"
              answer="Yes! You can log in on any browser via the web app or install the native Android APK."
            />
            <FaqItem
              question="How do Android app updates work?"
              answer="The app includes built-in version checking and alerts you directly whenever a new version is released."
            />
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="pt-6 border-t border-white/5 w-full flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/30">
          <p>© 2026 WispEcho · Built for the next generation</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-white/60 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/60 transition">Terms of Service</Link>
            <Link href="/download" className="hover:text-white/60 transition">Download APK</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
