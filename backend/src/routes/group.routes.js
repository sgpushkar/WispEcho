import { Router } from "express";
import * as groupController from "../controllers/groupController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/", groupController.createGroup);
router.get("/:groupId", groupController.getGroupDetails);
router.patch("/:groupId", groupController.updateGroupDetails);
router.post("/:groupId/invite", groupController.inviteMembers);
router.patch("/:groupId/members/:userId/role", groupController.updateMemberRole);
router.delete("/:groupId/members/:userId", groupController.kickMember);
router.post("/:groupId/leave", groupController.leaveGroup);
router.delete("/:groupId", groupController.deleteGroup);

// Feature v2 routes
router.post("/:groupId/join-link", groupController.generateJoinLink);
router.post("/join/:joinCode", groupController.joinByCode);
router.get("/:groupId/join-requests", groupController.getJoinRequests);
router.post("/:groupId/join-requests/:requestId/approve", groupController.approveJoinRequest);
router.post("/:groupId/join-requests/:requestId/reject", groupController.rejectJoinRequest);
router.patch("/:groupId/settings", groupController.updateGroupSettings);
router.post("/:groupId/events", groupController.createGroupEvent);
router.get("/:groupId/events", groupController.getGroupEvents);
router.delete("/:groupId/events/:eventId", groupController.deleteGroupEvent);

export default router;
