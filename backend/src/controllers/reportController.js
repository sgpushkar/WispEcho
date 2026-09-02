import prisma from "../config/db.js";

/**
 * Submit a report for a user profile, media, or message.
 * Supports:
 * - contentType: "USER" | "MEDIA" | "MESSAGE"
 * - reportedId or reportedUsername
 * - contentId (e.g. messageId)
 * - reason & optional description
 */
export async function createReport(req, res, next) {
  try {
    const reporterId = req.userId;
    let { reportedId, reportedUsername, contentType = "USER", contentId, reason, description } = req.body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ error: "Report reason is required." });
    }

    const validTypes = ["USER", "PROFILE", "MEDIA", "MESSAGE"];
    let normalizedType = (contentType || "USER").toUpperCase();
    if (normalizedType === "PROFILE") normalizedType = "USER";

    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({ error: `Invalid content type: ${contentType}` });
    }

    // If message/media contentId is provided, resolve message and sender if reportedId not explicitly given
    if (contentId && (normalizedType === "MESSAGE" || normalizedType === "MEDIA")) {
      const message = await prisma.message.findUnique({
        where: { id: contentId },
        select: { id: true, senderId: true, type: true, isDeleted: true },
      });

      if (!message) {
        return res.status(404).json({ error: "The reported content was not found or has been deleted." });
      }

      if (!reportedId) {
        reportedId = message.senderId;
      }
    }

    // Resolve reportedId by username if not directly provided
    if (!reportedId && reportedUsername) {
      const targetUser = await prisma.user.findFirst({
        where: { username: { equals: reportedUsername, mode: "insensitive" } },
        select: { id: true },
      });
      if (targetUser) {
        reportedId = targetUser.id;
      }
    }

    if (!reportedId) {
      return res.status(400).json({ error: "Reported user could not be determined." });
    }

    if (reporterId === reportedId) {
      return res.status(400).json({ error: "You cannot report yourself." });
    }

    // Verify reported user exists
    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedId },
      select: { id: true, username: true, displayName: true },
    });

    if (!reportedUser) {
      return res.status(404).json({ error: "The reported user does not exist." });
    }

    // Check for duplicate pending report by the same reporter
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        reportedId,
        contentType: normalizedType,
        contentId: contentId || null,
        status: { in: ["PENDING", "OPEN"] },
      },
    });

    if (existingReport) {
      return res.status(409).json({
        error: "You have already submitted a pending report for this item. Our moderation team is reviewing it.",
      });
    }

    const fullReason = description && description.trim()
      ? `${reason.trim()} — ${description.trim()}`
      : reason.trim();

    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedId,
        contentType: normalizedType,
        contentId: contentId || null,
        reason: fullReason,
        status: "PENDING",
      },
      include: {
        reported: { select: { id: true, username: true, displayName: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully. Thank you for helping keep the community safe.",
      report,
    });
  } catch (err) {
    next(err);
  }
}
