import { Router } from "express";
import * as reportController from "../controllers/reportController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/", reportController.createReport);

export default router;
