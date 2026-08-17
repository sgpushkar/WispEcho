import { Router } from "express";
import * as userController from "../controllers/userController.js";
import * as userProfileController from "../controllers/userProfileController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.patch("/me", userController.updateProfile);
router.get("/search", userController.searchUsers);
router.get("/:username", userController.getUserByUsername);

// Profile & Social Features
router.get("/:userId/profile", userProfileController.getUserProfile);
router.patch("/me/profile", userProfileController.updateMyProfile);

export default router;
