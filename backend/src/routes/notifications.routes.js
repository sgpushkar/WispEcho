import { Router } from "express";
import * as notificationsController from "../controllers/notificationsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", notificationsController.listNotifications);
router.post("/mark-all-read", notificationsController.markAllNotificationsRead);
router.patch("/:notificationId/read", notificationsController.markNotificationRead);
router.delete("/:notificationId", notificationsController.deleteNotification);

export default router;
