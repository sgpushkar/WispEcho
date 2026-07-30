import { Router } from "express";
import { getCloudinarySignature } from "../controllers/uploadController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/signature", getCloudinarySignature);

export default router;
