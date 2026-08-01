import webpush from "web-push";
import prisma from "../config/db.js";

// Initialize web-push with VAPID keys from env
const initWebPush = () => {
  const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
  const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicVapidKey || !privateVapidKey || !subject) {
    console.warn("VAPID keys not configured, Web Push will be disabled.");
    return false;
  }

  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
  return true;
};

const isConfigured = initWebPush();

export const sendPushNotification = async (userId, payload) => {
  if (!isConfigured) return;

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify(payload);

    const notifications = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          pushPayload
        );
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription has expired or is no longer valid
          console.log(`Removing invalid push subscription for user ${userId}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error("Error sending push notification:", error);
        }
      }
    });

    await Promise.all(notifications);
  } catch (error) {
    console.error("Failed to process push notifications:", error);
  }
};
