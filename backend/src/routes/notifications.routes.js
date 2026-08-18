import { Router } from "express";
import * as notificationsController from "../controllers/notificationsController.js";
import { subscribe, unsubscribe } from "../controllers/pushController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);
router.get("/", notificationsController.listNotifications);
router.post("/mark-all-read", notificationsController.markAllNotificationsRead);
router.patch("/:notificationId/read", notificationsController.markNotificationRead);
router.delete("/:notificationId", notificationsController.deleteNotification);

// Feature v2 routes
router.get("/preferences", notificationsController.getConversationPreferences);
router.patch("/:conversationId/mute", notificationsController.muteConversation);
router.get("/dnd", notificationsController.getDoNotDisturb);
router.put("/dnd", notificationsController.upsertDoNotDisturb);
router.patch("/email-digest", notificationsController.updateEmailDigest);

export default router;
