import prisma from "../config/db.js";

// GET /api/notifications — list all for current user, most recent first
export async function listNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:notificationId/read — mark one as read
export async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== req.userId) {
      return res.status(404).json({ error: "Notification not found" });
    }
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    res.json({ notification: updated });
  } catch (err) {
    next(err);
  }
}

// POST /api/notifications/mark-all-read — mark all as read for user
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

// DELETE /api/notifications/:notificationId — delete one notification
export async function deleteNotification(req, res, next) {
  try {
    const { notificationId } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== req.userId) {
      return res.status(404).json({ error: "Notification not found" });
    }
    await prisma.notification.delete({ where: { id: notificationId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
