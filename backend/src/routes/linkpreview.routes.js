import express from "express";
import { getLinkPreview } from "../controllers/linkPreviewController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, getLinkPreview);

export default router;
