import { Router } from "express";
import * as groupController from "../controllers/groupController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/", groupController.createGroup);
router.get("/:groupId", groupController.getGroupDetails);
router.post("/:groupId/invite", groupController.inviteMembers);
router.patch("/:groupId/members/:userId/role", groupController.updateMemberRole);
router.delete("/:groupId/members/:userId", groupController.kickMember);

export default router;
