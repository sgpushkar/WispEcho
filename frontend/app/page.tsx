"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHasHydrated } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MessageCircle,
  Smartphone,
  Globe,
  Eye,
  Bell,
  Image as ImageIcon,
  Zap,
  Shield,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const features = [
  { icon: Zap, label: "Real-Time Messaging", desc: "Instant delivery via Socket.io" },
  { icon: Eye, label: "View Once Media", desc: "Photos that vanish after one view" },
  { icon: ImageIcon, label: "Image Uploads", desc: "Cloudinary CDN with progress tracking" },
  { icon: Bell, label: "Push Notifications", desc: "Stay updated even in background" },
  { icon: Shield, label: "Privacy First", desc: "Your data, your control" },
  { icon: MessageCircle, label: "Group Chats", desc: "Connect with everyone at once" },
];

export default function LandingPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useHasHydrated();
  const [isNative, setIsNative] = useState<boolean | null>(null);
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    import("@capacitor/core").then(({ Capacitor }) => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);
      if (hydrated && accessToken) {
        router.replace("/chat");
      } else if (native) {
        // On native app, skip landing page and go to login directly
        if (hydrated) router.replace("/login");
      } else {
        setShowLanding(true);
      }
    }).catch(() => {
      setIsNative(false);
      if (hydrated && accessToken) {
        router.replace("/chat");
      } else {
        setShowLanding(true);
      }
    });
  }, [hydrated, accessToken, router]);

  if (!showLanding) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-base overflow-x-hidden">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.01] blur-[80px]" />
      </div>

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl border-b border-white/5 bg-base/80"
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="WispEcho" className="h-8 w-8 rounded-xl border border-white/10" />
          <span className="font-semibold text-white text-lg tracking-tight">WispEcho</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-white/60 hover:text-white transition px-4 py-2 rounded-xl hover:bg-white/5"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-white text-black px-4 py-2 rounded-xl hover:bg-white/90 transition shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            Get Started
          </Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-36 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60 backdrop-blur-md"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          Now available on Android & Web
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 24 }}
          className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6 max-w-3xl"
        >
          Chat that{" "}
          <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">
            actually hits
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg text-white/50 max-w-xl mb-12 leading-relaxed"
        >
          Ultra-fast, privacy-first messaging with View Once media, real-time notifications,
          and a premium design that feels as good as it looks.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm sm:max-w-none sm:w-auto"
        >
          <Link
            href="/register"
            className="group flex items-center gap-2 w-full sm:w-auto justify-center bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all duration-200 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] text-[15px]"
          >
            <Globe size={18} />
            Continue on Web
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/download"
            className="group flex items-center gap-2 w-full sm:w-auto justify-center bg-white/5 border border-white/10 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-[15px] backdrop-blur-sm"
          >
            <Smartphone size={18} />
            Download Android App
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* App screenshot mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 120, damping: 20 }}
          className="mt-20 relative w-full max-w-3xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] p-4">
            {/* Fake chat UI */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5" />
              <div>
                <div className="text-xs font-semibold text-white">Alex</div>
                <div className="text-[10px] text-green-400">online</div>
              </div>
            </div>
            <div className="space-y-3 px-2">
              {[
                { mine: false, text: "yo did you see that?? 🔥", time: "2:41 PM" },
                { mine: true, text: "bro YES I'm obsessed with this app already", time: "2:41 PM" },
                { mine: false, text: "sending you something 👀", time: "2:42 PM", viewOnce: true },
                { mine: true, text: "WAIT this view once feature is crazy", time: "2:42 PM" },
              ].map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.mine ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className={`flex ${msg.mine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-xs ${msg.mine ? "bg-white text-black" : "bg-white/10 text-white border border-white/10"}`}>
                    {msg.viewOnce ? (
                      <div className="flex items-center gap-1.5 text-accent">
                        <Eye size={11} />
                        <span>Photo · View once</span>
                      </div>
                    ) : msg.text}
                    <div className={`text-[9px] mt-1 ${msg.mine ? "text-black/40" : "text-white/30"}`}>{msg.time}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-4 py-20 max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-bold text-white text-center mb-3"
        >
          Everything you need
        </motion.h2>
        <p className="text-white/40 text-center mb-12 text-sm">Packed with features that make every conversation feel premium</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 group"
            >
              <f.icon size={20} className="text-accent mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold text-white mb-1">{f.label}</div>
              <div className="text-xs text-white/40">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to start?</h2>
          <p className="text-white/40 text-sm mb-8">Join WispEcho and experience messaging like never before.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-white/90 transition shadow-[0_0_40px_rgba(255,255,255,0.1)] text-[15px]"
            >
              <Globe size={18} /> Start on Web — Free
            </Link>
            <Link
              href="/download"
              className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition text-[15px]"
            >
              <Smartphone size={18} /> Download App
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-xs text-white/30">
        <p>© 2026 WispEcho · Built for the next generation</p>
      </footer>
    </div>
  );
}
