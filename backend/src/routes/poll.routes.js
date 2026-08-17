import { Router } from "express";
import * as pollController from "../controllers/pollController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/", pollController.createPoll);
router.get("/:pollId", pollController.getPoll);
router.post("/:pollId/vote", pollController.votePoll);
router.post("/:pollId/close", pollController.closePoll);

export default router;
