import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAdminRoles } from "../middleware/adminGuard.js";
import * as adminController from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require authentication and an admin role
router.use(requireAuth, requireAdminRoles(["SUPER_ADMIN", "ADMIN", "MODERATOR"]));

// Dashboard
router.get("/dashboard", adminController.getDashboardStats);

// Users
router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserDetail);
router.patch("/users/:id/role", requireAdminRoles(["SUPER_ADMIN"]), adminController.updateUserRole);

// Subscriptions & Payments
router.post("/payments/record", adminController.recordPaymentAndGrantPro);
router.post("/users/:id/revoke", adminController.revokeUserPro);

// Audit Logs
router.get("/audit-logs", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.getAuditLogs);

export default router;
