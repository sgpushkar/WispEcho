import cron from "node-cron";
import prisma from "../config/db.js";
import { notifyUser, emitToConversation } from "../sockets/index.js";
import { sendEmail } from "../utils/mailer.js";

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

// Run every minute for scheduled & disappearing messages
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    // 1. Send Scheduled Messages
    const scheduled = await prisma.message.findMany({
      where: {
        scheduledAt: { lte: now },
        status: "SENT",
        isDeleted: false
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        replyTo: true,
      },
    });

    if (scheduled.length > 0) {
      // Mark them as not scheduled anymore by clearing scheduledAt (or we can just leave it as history, but let's just emit them)
      // Actually we just emit them, and maybe mark status = DELIVERED or clear scheduledAt so we don't re-emit.
      await prisma.message.updateMany({
        where: { id: { in: scheduled.map(m => m.id) } },
        data: { scheduledAt: null } // Clear so they aren't picked up again
      });

      for (const msg of scheduled) {
        // Strip mediaUrl if IMAGE
        const msgForSocket = msg.type === "IMAGE" ? { ...msg, mediaUrl: null, mediaPublicId: null } : msg;
        emitToConversation(msg.conversationId, "message:new", msgForSocket);
      }
    }

    // 2. Process Disappearing Messages
    const disappearing = await prisma.message.findMany({
      where: {
        disappearsAt: { lte: now },
        isDeleted: false
      }
    });

    if (disappearing.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: disappearing.map(m => m.id) } },
        data: { isDeleted: true, content: null, mediaUrl: null, mediaPublicId: null }
      });

      const byConv = disappearing.reduce((acc, m) => {
        (acc[m.conversationId] = acc[m.conversationId] || []).push(m.id);
        return acc;
      }, {});

      for (const [convId, ids] of Object.entries(byConv)) {
        ids.forEach(id => {
          emitToConversation(convId, "message:deleted", { id, conversationId: convId, forEveryone: true });
        });
      }
    }
  } catch (err) {
    console.error("❌ Error in message cron:", err);
  }
});

// Run daily at 8am for Email Digests
cron.schedule("0 8 * * *", async () => {
  try {
    const users = await prisma.user.findMany({
      where: { emailDigest: true, isDeleted: false, email: { not: "" } },
      select: { id: true, email: true, displayName: true }
    });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const user of users) {
      // Find unread messages from yesterday
      const unread = await prisma.message.count({
        where: {
          createdAt: { gte: yesterday },
          senderId: { not: user.id },
          conversation: { participants: { some: { userId: user.id, lastReadAt: { lt: yesterday } } } }
        }
      });

      if (unread > 0) {
        await sendEmail({
          to: user.email,
          subject: "Your WispEcho Daily Digest",
          html: `<p>Hi ${user.displayName},</p><p>You have ${unread} new messages on WispEcho.</p><a href="${process.env.FRONTEND_URL}">Check them out</a>`
        });
      }
    }
  } catch (err) {
    console.error("❌ Error in email digest cron:", err);
  }
});
