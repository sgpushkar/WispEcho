"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useToastStore, Toast, ToastType } from "@/hooks/useToast";

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
  error:   <AlertCircle  size={16} className="text-red-400    shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-400  shrink-0" />,
  info:    <Info          size={16} className="text-sky-400    shrink-0" />,
};

const BAR_COLORS: Record<ToastType, string> = {
  success: "bg-emerald-500",
  error:   "bg-red-500",
  warning: "bg-amber-500",
  info:    "bg-sky-500",
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="relative flex items-start gap-3 min-w-[260px] max-w-[340px] rounded-2xl border border-white/10 bg-[#1a1a1e]/95 backdrop-blur-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      {/* Colour accent bar */}
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${BAR_COLORS[toast.type]}`} />

      {ICONS[toast.type]}

      <p className="flex-1 text-[13px] text-white/90 leading-snug pr-1">{toast.message}</p>

      <button
        onClick={() => remove(toast.id)}
        className="text-white/30 hover:text-white/70 transition mt-0.5 shrink-0"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

/** Drop <Toaster /> anywhere in the layout once — it renders all active toasts. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
