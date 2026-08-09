import { Router } from "express";
import * as subscriptionController from "../controllers/subscriptionController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", subscriptionController.getSubscription);
router.post("/activate", subscriptionController.activatePro);
router.post("/cancel", subscriptionController.cancelSubscription);

export default router;
