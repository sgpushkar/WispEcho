import express from "express";
import { subscribe, unsubscribe } from "../controllers/pushController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/subscribe", authenticate, subscribe);
router.post("/unsubscribe", authenticate, unsubscribe);

export default router;
