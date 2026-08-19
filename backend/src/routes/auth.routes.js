import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/google", authController.googleLogin);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/verify-email", authController.verifyEmail);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", requireAuth, authController.me);
router.post("/set-password", requireAuth, authController.setPassword);
router.post("/change-password", requireAuth, authController.changePassword);
router.get("/sessions", requireAuth, authController.getSessions);
router.delete("/sessions/:sessionId", requireAuth, authController.deleteSession);

export default router;
