import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.patch("/me", userController.updateProfile);
router.get("/search", userController.searchUsers);
router.get("/:username", userController.getUserByUsername);

export default router;
