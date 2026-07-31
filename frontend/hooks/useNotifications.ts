import { useEffect } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

export function useNotifications() {
  useEffect(() => {
    async function requestPermission() {
      try {
        if (Capacitor.isNativePlatform()) {
          const status = await LocalNotifications.checkPermissions();
          if (status.display !== "granted") {
            await LocalNotifications.requestPermissions();
          }
        } else if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "default") {
            await Notification.requestPermission();
          }
        }
      } catch (err) {
        console.error("Failed to request notification permission:", err);
      }
    }

    requestPermission();
  }, []);

  const sendNotification = async (title: string, body: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Math.random() * 100000),
              // No `schedule` = fires immediately
              extra: null,
            },
          ],
        });
      } else if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, { body, icon: "/logo.png" });
        } else if (Notification.permission === "default") {
          const res = await Notification.requestPermission();
          if (res === "granted") {
            new Notification(title, { body, icon: "/logo.png" });
          }
        }
      }
    } catch (err) {
      console.error("Error triggering notification:", err);
    }
  };

  return { sendNotification };
}
