"use client";

import { Download, AlertTriangle, Sparkles, ArrowUpCircle, X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateChecker, CURRENT_VERSION } from "@/hooks/useUpdateChecker";

export { CURRENT_VERSION };

export function UpdateChecker() {
  const {
    status,
    payload,
    downloadProgress,
    error,
    startDownload,
    cancelDownload,
    dismiss,
    openInBrowser,
  } = useUpdateChecker();

  const isVisible = status === "update-available" || status === "force-update" || status === "downloading" || status === "download-complete" || status === "download-error";
  const isForce = status === "force-update";
  const isDownloading = status === "downloading";
  const isComplete = status === "download-complete";
  const isError = status === "download-error";

  // Get the latest changelog entry for display
  const latestChanges = payload?.changelog?.[0]?.changes;

  return (
    <AnimatePresence>
      {isVisible && payload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass max-w-sm w-full rounded-[32px] p-6 border border-white/10 flex flex-col items-center text-center space-y-5"
          >
            {/* Close button — optional updates only */}
            {!isForce && !isDownloading && (
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            )}

            {/* Icon */}
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${
              isForce
                ? "bg-red-500/10 border-red-500/20"
                : isError
                  ? "bg-orange-500/10 border-orange-500/20"
                  : isComplete
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-white/5 border-white/10"
            }`}>
              {isForce ? (
                <AlertTriangle size={24} className="text-red-400" />
              ) : isError ? (
                <AlertTriangle size={24} className="text-orange-400" />
              ) : isComplete ? (
                <ArrowUpCircle size={24} className="text-green-400" />
              ) : (
                <Download size={24} className="text-white" />
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">
                {isForce
                  ? "Update Required"
                  : isComplete
                    ? "Download Complete"
                    : isError
                      ? "Download Failed"
                      : "Update Available"}
              </h3>
              <p className="text-xs text-white/50 leading-relaxed max-w-[280px]">
                {isForce
                  ? "This version is no longer supported. Please update WispEcho to continue."
                  : isComplete
                    ? "The APK has been downloaded. Open it to install the update."
                    : isError
                      ? error || "Something went wrong. Try again or download from browser."
                      : "A new version of WispEcho is available with new features and improvements."}
              </p>
            </div>

            {/* Version Badge */}
            <div className="flex items-center gap-2 bg-white/5 rounded-2xl px-4 py-2 border border-white/5 text-xs text-white/70">
              <span className="opacity-50">v{CURRENT_VERSION}</span>
              <span className="opacity-30">→</span>
              <span className="font-semibold text-white">v{payload.latestVersion}</span>
            </div>

            {/* Download Progress Bar */}
            {isDownloading && (
              <div className="w-full space-y-2">
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-white/40 to-white/80 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ duration: 0.2, ease: "linear" }}
                  />
                </div>
                <p className="text-[11px] text-white/40">{downloadProgress}% downloaded</p>
              </div>
            )}

            {/* Changelog — only show when not downloading */}
            {latestChanges && !isDownloading && !isComplete && !isError && (
              <div className="w-full text-left space-y-3 pt-1 border-t border-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 pl-1">
                  What's New
                </p>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {latestChanges.new?.map((item, i) => (
                    <div key={`new-${i}`} className="flex items-start gap-2 text-xs">
                      <Sparkles size={11} className="text-violet-400 mt-0.5 shrink-0" />
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                  {latestChanges.improved?.map((item, i) => (
                    <div key={`imp-${i}`} className="flex items-start gap-2 text-xs">
                      <ArrowUpCircle size={11} className="text-blue-400 mt-0.5 shrink-0" />
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                  {latestChanges.fixed?.map((item, i) => (
                    <div key={`fix-${i}`} className="flex items-start gap-2 text-xs">
                      <span className="text-green-400 mt-0.5 shrink-0 text-[11px]">✓</span>
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex w-full gap-3 pt-1">
              {isDownloading ? (
                <button
                  onClick={cancelDownload}
                  className="flex-1 rounded-2xl bg-white/5 border border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-white/80 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              ) : isComplete ? (
                <button
                  onClick={dismiss}
                  className="flex-1 rounded-2xl bg-white text-black py-3 text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition"
                >
                  Done
                </button>
              ) : isError ? (
                <>
                  <button
                    onClick={startDownload}
                    className="flex-1 rounded-2xl bg-white/5 border border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-white/80 hover:bg-white/10 transition"
                  >
                    Retry
                  </button>
                  <button
                    onClick={openInBrowser}
                    className="flex-1 rounded-2xl bg-white text-black py-3 text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={13} />
                    Browser
                  </button>
                </>
              ) : (
                <>
                  {!isForce && (
                    <button
                      onClick={dismiss}
                      className="flex-1 rounded-2xl bg-white/5 border border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-white/80 hover:bg-white/10 transition"
                    >
                      Later
                    </button>
                  )}
                  <button
                    onClick={startDownload}
                    className={`${isForce ? "w-full" : "flex-1"} rounded-2xl bg-white text-black py-3 text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition flex items-center justify-center gap-1.5`}
                  >
                    <Download size={13} />
                    {isForce ? "Update Now" : "Update"}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
