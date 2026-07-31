import express from "express";
import { getLinkPreview } from "../controllers/linkPreviewController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, getLinkPreview);

export default router;
