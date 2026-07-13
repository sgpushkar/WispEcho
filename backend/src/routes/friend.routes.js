import { Router } from "express";
import * as friendController from "../controllers/friendController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", friendController.listFriends);
router.get("/requests", friendController.listPendingRequests);
router.post("/requests", friendController.sendFriendRequest);
router.patch("/requests/:friendshipId", friendController.respondFriendRequest);
router.post("/block", friendController.blockUser);

export default router;
