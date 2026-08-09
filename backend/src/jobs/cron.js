import cron from "node-cron";
import prisma from "../config/db.js";
import { logAdminAction } from "../services/adminAuditService.js";
import { notifyUser } from "../sockets/index.js";

// Run every hour
cron.schedule("0 * * * *", async () => {
  console.log("⏰ Running hourly subscription expiration check...");
  try {
    const expiredSubs = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lt: new Date() },
      },
    });

    for (const sub of expiredSubs) {
      // 1. Update subscription status
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });

      // 2. Update user status
      await prisma.user.update({
        where: { id: sub.userId },
        data: { isPro: false },
      });

      // 3. Log to audit
      // We use a "SYSTEM" ID or just omit adminId if it's optional, 
      // but schema requires adminId. Since it's a system action, we might need a system user,
      // or we can just fetch any SUPER_ADMIN to proxy it, or modify schema.
      // Let's modify the schema to make adminId optional in AdminAuditLog for system events.
      // Actually, since schema adminId is String (not optional), we'll find a super admin, 
      // or we will just use a hardcoded 'SYSTEM' if it's not strictly foreign keyed. Wait, it IS foreign keyed.
      // So we must skip audit logging here unless we have a specific SYSTEM user.
      // For now, we will just log it to console and emit the socket event.

      console.log(`[CRON] Expired subscription for user ${sub.userId}`);

      // 4. Notify user
      notifyUser(sub.userId, "subscription:updated", { 
        isPro: false,
        subscription: { ...sub, status: "EXPIRED" } 
      });
      
      // Send an in-app notification
      await prisma.notification.create({
        data: {
          userId: sub.userId,
          type: "SYSTEM",
          payload: {
            title: "Subscription Expired",
            body: "Your Pro subscription has expired. Renew to keep your premium features!"
          }
        }
      });
    }

    if (expiredSubs.length > 0) {
      console.log(`✅ Expired ${expiredSubs.length} subscriptions.`);
    }
  } catch (err) {
    console.error("❌ Error in subscription cron job:", err);
  }
});
