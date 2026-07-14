import { Router } from "express";
import * as messageController from "../controllers/messageController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/search", messageController.searchMessages);
router.get("/conversations", messageController.listConversations);
router.get("/conversations/direct/:userId", messageController.getOrCreateDirectConversation);
router.get("/conversations/:conversationId/messages", messageController.getMessages);
router.post("/conversations/:conversationId/read", messageController.markRead);
router.patch("/conversations/:conversationId/pin", messageController.togglePinChat);
router.post("/", messageController.sendMessage);
router.patch("/:messageId", messageController.editMessage);
router.delete("/:messageId", messageController.deleteMessage);
router.post("/:messageId/reactions", messageController.reactToMessage);
router.post("/:messageId/save", messageController.toggleSaveMessage);

export default router;
