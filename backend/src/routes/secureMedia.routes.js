import { Router } from "express";
import { proxyMediaImage, registerUploadedMedia } from "../controllers/secureMediaController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET  /api/media/image/:messageId
// Streams image bytes after verifying the requester is a conversation participant.
// The raw Cloudinary URL is NEVER sent to the client — this is the only way to access media.
router.get("/image/:messageId", proxyMediaImage);

// POST /api/media/register — save Cloudinary public_id after upload completes
router.post("/register", registerUploadedMedia);

export default router;
