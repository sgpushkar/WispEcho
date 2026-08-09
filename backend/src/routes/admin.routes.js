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
router.post("/users/:id/warn", requireAdminRoles(["SUPER_ADMIN", "ADMIN", "MODERATOR"]), adminController.warnUser);
router.post("/users/:id/suspend", requireAdminRoles(["SUPER_ADMIN", "ADMIN", "MODERATOR"]), adminController.suspendUser);
router.post("/users/:id/ban", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.banUser);
router.post("/users/:id/delete", requireAdminRoles(["SUPER_ADMIN"]), adminController.deleteUser);

// Subscriptions & Payments
router.post("/payments/record", adminController.recordPaymentAndGrantPro);
router.post("/users/:id/revoke", adminController.revokeUserPro);

// Audit Logs
router.get("/audit-logs", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.getAuditLogs);

export default router;
