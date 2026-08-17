import cron from "node-cron";
import prisma from "../config/db.js";
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

    if (expiredSubs.length === 0) return;

    const expiredIds = expiredSubs.map((s) => s.id);
    const expiredUserIds = expiredSubs.map((s) => s.userId);

    // 1. Bulk-update all expired subscriptions in one query
    await prisma.subscription.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: "EXPIRED" },
    });

    // 2. Bulk-update all affected users' isPro flag in one query
    await prisma.user.updateMany({
      where: { id: { in: expiredUserIds } },
      data: { isPro: false },
    });

    // 3. Notify each user in real-time and create an in-app notification
    for (const sub of expiredSubs) {
      console.log(`[CRON] Expired subscription for user ${sub.userId}`);

      notifyUser(sub.userId, "subscription:updated", {
        isPro: false,
        subscription: { ...sub, status: "EXPIRED" },
      });

      // Send an in-app notification
      await prisma.notification.create({
        data: {
          userId: sub.userId,
          type: "SYSTEM",
          payload: {
            title: "Subscription Expired",
            body: "Your Pro subscription has expired. Renew to keep your premium features!",
          },
        },
      });
    }

    console.log(`✅ Expired ${expiredSubs.length} subscriptions.`);
  } catch (err) {
    console.error("❌ Error in subscription cron job:", err);
  }
});

