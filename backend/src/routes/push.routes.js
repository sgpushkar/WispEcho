import express from "express";
import { subscribe, unsubscribe } from "../controllers/pushController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/subscribe", requireAuth, subscribe);
router.post("/unsubscribe", requireAuth, unsubscribe);

export default router;
