"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHasHydrated } from "@/store/useAuthStore";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MessageCircle, Smartphone, Globe, Eye, Bell, Image as ImageIcon,
  Zap, Shield, ArrowRight, ChevronDown, Users, Lock,
  Check, Star, Sparkles, Phone, Video, Smile, Plus, Minus, HelpCircle,
} from "lucide-react";

/* ─── helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] } }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

/* ─── data ─── */
const features = [
  { icon: Zap,          title: "Instant delivery",       desc: "Messages land in milliseconds via Socket.io WebSockets." },
  { icon: Eye,          title: "View Once media",         desc: "Photos that self-destruct after one view — like they never existed." },
  { icon: ImageIcon,    title: "Rich image sharing",      desc: "Upload via Cloudinary with real-time progress bars & drag-drop." },
  { icon: Bell,         title: "Push notifications",      desc: "Native Android & web push so you never miss a thing." },
  { icon: Shield,       title: "Privacy first",           desc: "No ads. No tracking. Your data stays yours." },
  { icon: Users,        title: "Group conversations",     desc: "Bring the whole squad together in real-time group chats." },
  { icon: Lock,         title: "Google Sign-In",          desc: "One-tap secure login with automatic account linking." },
  { icon: Sparkles,     title: "Premium themes",          desc: "Ultra-sleek dark & light modes with custom accent colours." },
];

const steps = [
  { n: "01", title: "Create your account", desc: "Sign up with email or one-tap Google — no credit card, no nonsense." },
  { n: "02", title: "Find your people",    desc: "Search by username, add friends, start a one-on-one or group chat instantly." },
  { n: "03", title: "Just vibe",           desc: "Send texts, images, View Once media and reactions — all in real time." },
];

const mockMessages = [
  { mine: false, text: "bro you HAVE to try this app 👀",        time: "2:40 PM" },
  { mine: true,  text: "lol what is it",                         time: "2:41 PM" },
  { mine: false, text: "WispEcho — it's actually insane",        time: "2:41 PM" },
  { mine: true,  text: "ok sending you something private 🤫",    time: "2:42 PM", viewOnce: true },
  { mine: false, text: "WAIT the view once thing is so cool 🔥", time: "2:43 PM" },
];

/* ─── components ─── */
function Glow({ className }: { className: string }) {
  return <div className={`pointer-events-none absolute rounded-full blur-[120px] opacity-30 ${className}`} />;
}

function FaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-white/8 bg-white/[0.025] overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-white hover:bg-white/[0.02] transition"
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
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-xs text-white/45 leading-relaxed border-t border-white/5 pt-3">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, desc, i }: any) {
  return (
    <motion.div
      variants={fadeUp}
      custom={i}
      className="group relative rounded-3xl border border-white/5 bg-white/[0.025] p-6 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/8 group-hover:bg-white/10 transition">
        <Icon size={18} className="text-white/70 group-hover:text-white transition" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function ChatMockup() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= mockMessages.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 700);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="w-full max-w-sm mx-auto rounded-[28px] border border-white/10 bg-[#111]/80 backdrop-blur-xl shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">A</div>
        <div>
          <p className="text-sm font-semibold text-white">Alex</p>
          <p className="text-[10px] text-green-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />online</p>
        </div>
        <div className="ml-auto flex gap-3 text-white/25">
          <Phone size={16} />
          <Video size={16} />
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 py-5 space-y-3 min-h-[260px]">
        <AnimatePresence>
          {mockMessages.slice(0, visible).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className={`flex ${msg.mine ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.mine
                  ? "bg-white text-black rounded-br-sm"
                  : "bg-white/[0.07] text-white border border-white/5 rounded-bl-sm"
              }`}>
                {msg.viewOnce ? (
                  <span className="flex items-center gap-1.5 text-violet-400">
                    <Eye size={11} />photo · view once
                  </span>
                ) : msg.text}
                <div className={`text-[9px] mt-1 ${msg.mine ? "text-black/35 text-right" : "text-white/25"}`}>{msg.time}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3">
          <Smile size={15} className="text-white/25 shrink-0" />
          <span className="text-xs text-white/20 flex-1">Message Alex…</span>
          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowRight size={11} className="text-white/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── main page ─── */
export default function LandingPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useHasHydrated();
  const [isNative, setIsNative] = useState<boolean | null>(null);
  const [showLanding, setShowLanding] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    import("@capacitor/core").then(({ Capacitor }) => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);
      if (native && hydrated) {
        router.replace(accessToken ? "/chat" : "/login");
        return;
      }
      setShowLanding(true);
    }).catch(() => {
      setIsNative(false);
      setShowLanding(true);
    });
  }, [hydrated, accessToken, router]);

  if (!showLanding) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white overflow-x-hidden" style={{ overflowY: "auto" }}>

      {/* ── Nav ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 transition-all duration-300 ${
          navScrolled ? "bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 shadow-[0_1px_30px_rgba(0,0,0,0.4)]" : ""
        }`}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="WispEcho" className="h-8 w-8 rounded-xl border border-white/10" />
          <span className="font-bold text-white text-base tracking-tight">WispEcho</span>
        </div>
        <div className="hidden sm:flex items-center gap-8 text-sm text-white/50">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#how-it-works" className="hover:text-white transition">How it works</a>
          <a href="#download" className="hover:text-white transition">Download</a>
        </div>
        <div className="flex items-center gap-2">
          {accessToken ? (
            <Link href="/chat" className="text-sm font-semibold bg-white text-black px-5 py-2 rounded-xl hover:bg-white/90 transition shadow-[0_0_20px_rgba(255,255,255,0.08)]">
              Open App
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-white/60 hover:text-white transition px-4 py-2 rounded-xl hover:bg-white/5">
                Sign In
              </Link>
              <Link href="/register" className="text-sm font-semibold bg-white text-black px-5 py-2 rounded-xl hover:bg-white/90 transition shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                Get Started
              </Link>
            </>
          )}
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">
        {/* Background glows */}
        <Glow className="w-[700px] h-[700px] bg-violet-600 -top-48 left-1/2 -translate-x-1/2" />
        <Glow className="w-[400px] h-[400px] bg-indigo-500 top-1/2 -right-32" />
        <Glow className="w-[300px] h-[300px] bg-purple-700 bottom-0 -left-20" />

        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 flex flex-col items-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-4 py-1.5 text-xs text-white/60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Now live on Android &amp; Web · v1.2.0
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-6 max-w-4xl"
          >
            <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">The chat app</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
              that hits different.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="text-base sm:text-lg text-white/45 max-w-lg mb-10 leading-relaxed"
          >
            Real-time messaging with View Once media, push notifications,
            and a UI so clean it feels illegal.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
          >
            <Link href="/register"
              className="group flex items-center justify-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all duration-200 shadow-[0_0_50px_rgba(255,255,255,0.12)] hover:shadow-[0_0_70px_rgba(255,255,255,0.22)] text-[15px]"
            >
              <Globe size={18} />
              Start for free — web
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/download"
              className="group flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-[15px] backdrop-blur-sm"
            >
              <Smartphone size={18} />
              Download for Android
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 flex items-center gap-3 text-xs text-white/35"
          >
            <div className="flex -space-x-2">
              {["#7c3aed","#6366f1","#8b5cf6","#a78bfa"].map((c,i) => (
                <div key={i} className="h-7 w-7 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center text-[9px] font-bold" style={{ background: c }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span>Loved by early users · 100% free</span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/25 text-[10px]"
        >
          <span className="uppercase tracking-widest">scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown size={16} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Live Chat Demo ── */}
      <section className="relative py-24 px-4 overflow-hidden">
        <Glow className="w-[500px] h-[500px] bg-violet-700 top-0 left-1/2 -translate-x-1/2" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">Live preview</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              See it in action
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/40 max-w-md mx-auto text-sm leading-relaxed">
              This is a real-time demo. Messages animate in exactly as they do in the actual app.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChatMockup />
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-24 px-4 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">Features</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              Everything you need.<br />Nothing you don't.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/40 max-w-md mx-auto text-sm leading-relaxed">
              Built from scratch to be fast, private, and genuinely fun to use.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {features.map((f, i) => <FeatureCard key={f.title} {...f} i={i} />)}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative py-24 px-4 overflow-hidden">
        <Glow className="w-[500px] h-[500px] bg-indigo-600 bottom-0 right-0" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">How it works</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              Up and running<br />in 30 seconds
            </motion.h2>
          </motion.div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[28px] sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-white/5 to-transparent" />

            <div className="space-y-12">
              {steps.map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={`relative flex items-start gap-6 sm:gap-10 ${i % 2 !== 0 ? "sm:flex-row-reverse" : ""}`}
                >
                  {/* Number bubble */}
                  <div className="relative z-10 shrink-0 h-14 w-14 rounded-full border border-violet-500/40 bg-[#0a0a0a] flex items-center justify-center">
                    <span className="text-xs font-black text-violet-400">{s.n}</span>
                  </div>

                  <div className={`flex-1 rounded-3xl border border-white/5 bg-white/[0.025] p-6 ${i % 2 !== 0 ? "sm:text-right" : ""}`}>
                    <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-sm text-white/45 leading-relaxed">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison / Why WispEcho ── */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">Why WispEcho?</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-black tracking-tight">The upgrade you didn't know you needed</motion.h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-white/8 overflow-hidden"
          >
            {[
              ["Open & free", "Always free, no paywalls, no tricks"],
              ["View Once photos", "Send media that disappears after viewing"],
              ["Real-time presence", "See who's online as it happens"],
              ["Custom themes", "Make it yours with accent colours & dark/light"],
              ["Native Android app", "Full offline APK, no Play Store needed"],
              ["Push notifications", "Never miss a message, even in background"],
            ].map(([feat, detail], i) => (
              <motion.div
                key={feat}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-4 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition"
              >
                <div className="h-6 w-6 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-violet-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">{feat}</span>
                  <span className="text-xs text-white/35 ml-2">{detail}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="relative py-24 px-4 overflow-hidden">
        <Glow className="w-[500px] h-[500px] bg-purple-900/40 top-1/2 left-0 -translate-y-1/2" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">FAQ</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-black tracking-tight mb-4">Frequently Asked Questions</motion.h2>
            <motion.p variants={fadeUp} className="text-white/40 text-sm">Got questions? We've got answers.</motion.p>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                q: "Is WispEcho free to use?",
                a: "Yes, 100% free! There are no hidden subscriptions, premium paywalls, or ad tracking."
              },
              {
                q: "How do View Once photos work?",
                a: "When you send a media message with View Once enabled, the recipient can tap to reveal it once. As soon as it's viewed or closed, it's permanently expired and cannot be opened again."
              },
              {
                q: "Can I use WispEcho on both mobile and web?",
                a: "Absolutely! You can log in on any browser via the web app or install the native Android APK for background push notifications."
              },
              {
                q: "Do I need to sign up with Google?",
                a: "Google Sign-In is optional for quick 1-tap onboarding. You can also sign up traditionally with any valid email and password."
              },
              {
                q: "How do updates work on the Android app?",
                a: "The app has an in-app version checker. When a new version (like v1.2.0) is released, you will get an in-app banner to download the latest update directly."
              }
            ].map((faq, i) => (
              <FaqItem key={faq.q} question={faq.q} answer={faq.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Download ── */}
      <section id="download" className="relative py-28 px-4 overflow-hidden">
        <Glow className="w-[600px] h-[600px] bg-violet-600 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <motion.div variants={fadeUp} className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/8 px-4 py-1.5 text-xs text-violet-300">
            <Star size={11} fill="currentColor" /> Free forever
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-6xl font-black tracking-tight mb-5 leading-tight">
            Ready to start<br />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">chatting?</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 text-sm mb-10 max-w-sm mx-auto leading-relaxed">
            Jump in on web instantly, or grab the Android APK for the full native experience.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"
              className="group flex items-center justify-center gap-2 bg-white text-black font-bold px-9 py-4 rounded-2xl hover:bg-white/90 transition-all duration-200 shadow-[0_0_60px_rgba(255,255,255,0.12)] hover:shadow-[0_0_80px_rgba(255,255,255,0.22)] text-[15px]"
            >
              <Globe size={18} />
              Continue on Web
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/download"
              className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-semibold px-9 py-4 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-[15px]"
            >
              <Smartphone size={18} />
              Download APK · v1.2.0
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-xs text-white/25">
            No account required to browse · Sign up takes under 30 seconds
          </motion.p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="WispEcho" className="h-7 w-7 rounded-lg border border-white/10" />
            <span className="font-bold text-white/70 text-sm">WispEcho</span>
          </div>
          <div className="flex gap-6 text-xs text-white/30">
            <a href="#features" className="hover:text-white/60 transition">Features</a>
            <a href="#download" className="hover:text-white/60 transition">Download</a>
            <Link href="/login" className="hover:text-white/60 transition">Sign In</Link>
            <Link href="/register" className="hover:text-white/60 transition">Register</Link>
          </div>
          <p className="text-xs text-white/20">© 2026 WispEcho · Built for the next generation</p>
        </div>
      </footer>
    </div>
  );
}
