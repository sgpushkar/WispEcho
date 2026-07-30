"use client";

import { useState } from "react";
import { RefreshCw, Info, Download, FileText, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateChecker, CURRENT_VERSION } from "@/hooks/useUpdateChecker";

/**
 * Version info section for the Settings panel.
 * Shows current version, manual update check, and links.
 */
export function VersionSettings() {
  const { status, payload, checkForUpdate } = useUpdateChecker();
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<"none" | "up-to-date" | "available">("none");

  const handleManualCheck = async () => {
    setIsChecking(true);
    setCheckResult("none");
    await checkForUpdate();
    // The hook will update status — we just need to show feedback
    setTimeout(() => {
      setIsChecking(false);
      // Re-read status from the hook state after check completes
    }, 1500);
  };

  // Determine result based on hook status
  const displayResult =
    status === "up-to-date"
      ? "up-to-date"
      : status === "update-available" || status === "force-update"
        ? "available"
        : checkResult;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-1">
        App Version
      </p>

      {/* Current Version Card */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Info size={16} className="text-white/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">WispEcho</p>
            <p className="text-[11px] text-white/40">Version {CURRENT_VERSION}</p>
          </div>
        </div>

        {/* Status Badge */}
        <AnimatePresence mode="wait">
          {displayResult === "up-to-date" && (
            <motion.div
              key="up-to-date"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1"
            >
              <CheckCircle size={11} className="text-green-400" />
              <span className="text-[10px] font-medium text-green-400">Up to date</span>
            </motion.div>
          )}
          {displayResult === "available" && payload && (
            <motion.div
              key="available"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1"
            >
              <Download size={11} className="text-violet-400" />
              <span className="text-[10px] font-medium text-violet-400">v{payload.latestVersion}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleManualCheck}
          disabled={isChecking}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isChecking ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          <span>{isChecking ? "Checking..." : "Check Updates"}</span>
        </button>

        <a
          href="/download"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition"
        >
          <FileText size={13} />
          <span>Release Notes</span>
        </a>
      </div>
    </div>
  );
}
