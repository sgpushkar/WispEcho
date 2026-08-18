import { Router } from "express";
import * as messageController from "../controllers/messageController.js";
import * as forwardController from "../controllers/forwardController.js";
import * as pinnedMessageController from "../controllers/pinnedMessageController.js";
import * as groupController from "../controllers/groupController.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
router.use(requireAuth);

router.get("/search", messageController.searchMessages);
router.get("/conversations", messageController.listConversations);
router.get("/conversations/direct/:userId", messageController.getOrCreateDirectConversation);
router.get("/conversations/:conversationId/messages", messageController.getMessages);
router.get("/conversations/:conversationId/media", messageController.getSharedMedia);
router.post("/conversations/:conversationId/read", messageController.markRead);
router.patch("/conversations/:conversationId/pin", messageController.togglePinChat);
router.patch("/conversations/:conversationId/archive", messageController.toggleArchive);
router.patch("/conversations/:conversationId/favorite", messageController.toggleFavorite);
router.patch("/conversations/:conversationId/participant", messageController.updateParticipantSettings);
router.get("/saved", messageController.getSavedMessages);
router.post("/", messageController.sendMessage);
router.patch("/:messageId", messageController.editMessage);
router.delete("/:messageId", messageController.deleteMessage);
router.post("/:messageId/reactions", messageController.reactToMessage);
router.post("/:messageId/view", messageController.markViewOnce);
router.post("/:messageId/save", messageController.toggleSaveMessage);

// Feature v2 routes
router.post("/:messageId/forward", forwardController.forwardMessage);
router.delete("/bulk", pinnedMessageController.bulkDeleteMessages);
router.post("/conversations/:conversationId/pin/:messageId", pinnedMessageController.pinMessage);
router.delete("/conversations/:conversationId/pin/:messageId", pinnedMessageController.unpinMessage);
router.get("/conversations/:conversationId/pins", pinnedMessageController.getPinnedMessages);
router.patch("/conversations/:conversationId/disappear", groupController.setDisappearTimer);

export default router;
