import { useEffect } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import api from "../lib/api";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export function useNotifications() {
  useEffect(() => {
    async function setupNotifications() {
      try {
        if (Capacitor.isNativePlatform()) {
          const status = await LocalNotifications.checkPermissions();
          if (status.display !== "granted") {
            await LocalNotifications.requestPermissions();
          }

          // Register Action Types for Reply/React
          await LocalNotifications.registerActionTypes({
            types: [
              {
                id: "MESSAGE_ACTIONS",
                actions: [
                  {
                    id: "reply",
                    title: "Reply",
                    input: true, // Shows text input
                  },
                  {
                    id: "react",
                    title: "👍 React",
                    foreground: false,
                  },
                ],
              },
            ],
          });

          // Listen for action clicks (Reply/React)
          LocalNotifications.addListener("localNotificationActionPerformed", async (notificationAction) => {
            const { actionId, inputValue, notification } = notificationAction;
            const data = notification.extra;
            
            if (!data || !data.messageId) return;

            if (actionId === "reply" && inputValue) {
              await api.post(`/messages/${data.conversationId}`, {
                type: "TEXT",
                content: inputValue,
                replyToId: data.messageId
              }).catch(console.error);
            } else if (actionId === "react") {
              await api.post(`/messages/${data.messageId}/react`, {
                emoji: "👍"
              }).catch(console.error);
            }
          });

        } else if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            const registration = await navigator.serviceWorker.register("/sw.js");
            
            // Subscribe to Web Push
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (vapidPublicKey) {
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
              });

              // Send subscription to backend
              await api.post("/notifications/subscribe", {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh') as ArrayBuffer)))),
                  auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth') as ArrayBuffer))))
                },
                userAgent: navigator.userAgent
              }).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("Failed to setup notifications:", err);
      }
    }

    setupNotifications();

    return () => {
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.removeAllListeners();
      }
    };
  }, []);

  const sendNotification = async (title: string, body: string, data?: any) => {
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
              extra: data || null,
              actionTypeId: "MESSAGE_ACTIONS" // Attach the reply/react actions
            },
          ],
        });
      } else if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, { body, icon: "/logo.png" });
        }
      }
    } catch (err) {
      console.error("Error triggering notification:", err);
    }
  };

  return { sendNotification };
}
