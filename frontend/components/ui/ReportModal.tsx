"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Flag, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  Image as ImageIcon, 
  User as UserIcon,
  Loader2,
  Sparkles
} from "lucide-react";
import { Portal } from "./Portal";
import { useUIStore, ReportTarget } from "@/store/useUIStore";
import { Avatar } from "./Avatar";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

const REPORT_REASONS = [
  {
    id: "spam",
    label: "Spam / Scam / Fraud",
    desc: "Unsolicited promotional content, phishing, or financial scams",
    icon: "🚨",
  },
  {
    id: "nsfw",
    label: "Inappropriate / NSFW / Nudity",
    desc: "Sexually explicit content, nudity, or graphic material",
    icon: "🔞",
  },
  {
    id: "harassment",
    label: "Harassment / Hate Speech",
    desc: "Bullying, intimidation, hate speech, or targeted attacks",
    icon: "🤬",
  },
  {
    id: "violence",
    label: "Violence / Harm / Threats",
    desc: "Threats of harm, violent extremism, or dangerous behavior",
    icon: "⚠️",
  },
  {
    id: "impersonation",
    label: "Impersonation / Fake Account",
    desc: "Pretending to be someone else or deceptive profile info",
    icon: "🎭",
  },
  {
    id: "copyright",
    label: "Intellectual Property / Copyright",
    desc: "Sharing unauthorized copyrighted images, audio, or media",
    icon: "⚖️",
  },
  {
    id: "other",
    label: "Other Community Guideline Violation",
    desc: "Any other behavior violating platform rules",
    icon: "📝",
  },
];

export function ReportModal() {
  const { reportModalOpen, reportTarget, closeReportModal } = useUIStore();
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (reportModalOpen) {
      setSelectedReason("");
      setDetails("");
      setIsSubmitting(false);
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [reportModalOpen]);

  if (!reportModalOpen || !reportTarget) return null;

  const getTargetTitle = () => {
    switch (reportTarget.type) {
      case "MEDIA":
        return "Report Media";
      case "MESSAGE":
        return "Report Message";
      case "USER":
      default:
        return reportTarget.username ? `Report @${reportTarget.username}` : "Report User Profile";
    }
  };

  const getTargetSubtitle = () => {
    switch (reportTarget.type) {
      case "MEDIA":
        return "Help us keep WispEcho safe. Tell us what is wrong with this media file.";
      case "MESSAGE":
        return "Help us understand why this message violates community guidelines.";
      case "USER":
      default:
        return "Submit a report to our safety team for review. Reports are confidential.";
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      setErrorMessage("Please select a reason for the report.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const reasonObj = REPORT_REASONS.find((r) => r.id === selectedReason);
    const reasonLabel = reasonObj ? reasonObj.label : selectedReason;

    try {
      await api.post("/reports", {
        reportedId: reportTarget.userId,
        reportedUsername: reportTarget.username,
        contentType: reportTarget.type,
        contentId: reportTarget.messageId,
        reason: reasonLabel,
        description: details.trim() || undefined,
      });

      setIsSuccess(true);
      success("Report submitted. Our moderation team will investigate.");
      setTimeout(() => {
        closeReportModal();
      }, 1600);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to submit report. Please try again.";
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#121216]/95 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/20 text-red-400 shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">{getTargetTitle()}</h3>
                <p className="text-xs text-white/50">{getTargetSubtitle()}</p>
              </div>
            </div>
            <button
              onClick={closeReportModal}
              disabled={isSubmitting}
              className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition disabled:opacity-30"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-lg font-bold text-white">Report Received</h4>
                <p className="text-xs text-white/60 max-w-xs">
                  Thank you for helping protect the WispEcho community. Our moderation team has been alerted and will review this content shortly.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Target Preview Pill */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  {reportTarget.type === "USER" && (
                    <>
                      <Avatar
                        src={reportTarget.avatarUrl}
                        name={reportTarget.displayName || reportTarget.username || "?"}
                        className="w-10 h-10 rounded-full text-xs shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{reportTarget.displayName || reportTarget.username}</p>
                        <p className="text-[11px] text-white/40 truncate">@{reportTarget.username || "user"}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Profile
                      </span>
                    </>
                  )}

                  {reportTarget.type === "MEDIA" && (
                    <>
                      {reportTarget.mediaUrl ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                          <img
                            src={reportTarget.mediaUrl}
                            alt="Reported Media"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">
                          {reportTarget.displayName ? `Sent by ${reportTarget.displayName}` : "Media File"}
                        </p>
                        <p className="text-[11px] text-white/40 truncate">
                          {reportTarget.username ? `@${reportTarget.username}` : "Attached in conversation"}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        Media
                      </span>
                    </>
                  )}

                  {reportTarget.type === "MESSAGE" && (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">
                          {reportTarget.displayName ? `Message from ${reportTarget.displayName}` : "Chat Message"}
                        </p>
                        <p className="text-[11px] text-white/50 truncate italic">
                          "{reportTarget.messageContent || "Message content"}"
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Message
                      </span>
                    </>
                  )}
                </div>

                {/* Reason Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
                    Reason for report <span className="text-red-400">*</span>
                  </label>
                  <div className="space-y-1.5">
                    {REPORT_REASONS.map((reason) => {
                      const isSelected = selectedReason === reason.id;
                      return (
                        <button
                          key={reason.id}
                          type="button"
                          onClick={() => {
                            setSelectedReason(reason.id);
                            setErrorMessage(null);
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                            isSelected
                              ? "bg-red-500/15 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                              : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
                          }`}
                        >
                          <span className="text-lg shrink-0">{reason.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${isSelected ? "text-white" : "text-white/85"}`}>
                              {reason.label}
                            </p>
                            <p className="text-[11px] text-white/40 truncate">{reason.desc}</p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                              isSelected ? "border-red-400 bg-red-500" : "border-white/20"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                      Additional Details <span className="text-white/40 lowercase font-normal">(optional)</span>
                    </label>
                    <span className="text-[10px] text-white/40">{details.length}/500</span>
                  </div>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                    placeholder="Provide any additional context or details about this violation..."
                    rows={3}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 resize-none transition"
                  />
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2"
                  >
                    <AlertTriangle size={15} className="shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!isSuccess && (
            <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeReportModal}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedReason || isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Flag size={14} />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </Portal>
  );
}
