import prisma from "../config/db.js";

/** GET /api/inbox — list notifications for current user */
export async function listNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.userId, isRead: false },
    });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/inbox/:notificationId/read — mark notification as read */
export async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: req.userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** POST /api/inbox/mark-all-read — mark all notifications as read */
export async function markAllNotificationsRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/inbox/:notificationId — delete a notification */
export async function deleteNotification(req, res, next) {
  try {
    const { notificationId } = req.params;
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId: req.userId },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/inbox/clear-all — delete all notifications for current user */
export async function clearAllNotifications(req, res, next) {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.userId },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** GET /api/inbox/preferences */
export async function getConversationPreferences(req, res, next) {
  try {
    const prefs = await prisma.conversationParticipant.findMany({
      where: { userId: req.userId },
      select: { conversationId: true, isMuted: true, mutedUntil: true },
    });
    res.json({ preferences: prefs });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/inbox/:conversationId/mute */
export async function muteConversation(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { muteFor } = req.body; // "1h" | "8h" | "24h" | "forever" | null (unmute)

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    let isMuted = false;
    let mutedUntil = null;

    if (muteFor) {
      isMuted = true;
      if (muteFor === "1h") mutedUntil = new Date(Date.now() + 60 * 60 * 1000);
      else if (muteFor === "8h") mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000);
      else if (muteFor === "24h") mutedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      else if (muteFor === "forever") mutedUntil = null; // isMuted=true, no expiry
    }

    const updated = await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
      data: { isMuted, mutedUntil },
    });

    res.json({ isMuted: updated.isMuted, mutedUntil: updated.mutedUntil });
  } catch (err) {
    next(err);
  }
}

/** GET /api/inbox/dnd */
export async function getDoNotDisturb(req, res, next) {
  try {
    const dnd = await prisma.doNotDisturb.findUnique({ where: { userId: req.userId } });
    res.json({ dnd: dnd || { enabled: false, startHour: 22, endHour: 8, timezone: "UTC" } });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/inbox/dnd */
export async function upsertDoNotDisturb(req, res, next) {
  try {
    let { enabled, startHour, endHour, startTime, endTime, timezone } = req.body;

    // Parse startTime/endTime strings (e.g. "22:00") if startHour/endHour not explicitly passed
    if (startHour === undefined && startTime) {
      startHour = parseInt(String(startTime).split(":")[0], 10);
    }
    if (endHour === undefined && endTime) {
      endHour = parseInt(String(endTime).split(":")[0], 10);
    }

    if (startHour === undefined || endHour === undefined || isNaN(startHour) || isNaN(endHour)) {
      return res.status(400).json({ error: "startHour and endHour (or startTime and endTime) are required" });
    }

    const dnd = await prisma.doNotDisturb.upsert({
      where: { userId: req.userId },
      create: { 
        userId: req.userId, 
        enabled: !!enabled, 
        startHour: Math.max(0, Math.min(23, startHour)), 
        endHour: Math.max(0, Math.min(23, endHour)), 
        timezone: timezone || "UTC" 
      },
      update: { 
        enabled: !!enabled, 
        startHour: Math.max(0, Math.min(23, startHour)), 
        endHour: Math.max(0, Math.min(23, endHour)), 
        timezone: timezone || "UTC" 
      },
    });
    res.json({ dnd });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/inbox/email-digest */
export async function updateEmailDigest(req, res, next) {
  try {
    const { enabled } = req.body;
    await prisma.user.update({ where: { id: req.userId }, data: { emailDigest: enabled } });
    res.json({ emailDigest: enabled });
  } catch (err) {
    next(err);
  }
}
