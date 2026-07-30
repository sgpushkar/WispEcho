import { Router } from "express";
import { getVersion } from "../controllers/versionController.js";

const router = Router();

// Canonical API route
router.get("/", getVersion);

export default router;
