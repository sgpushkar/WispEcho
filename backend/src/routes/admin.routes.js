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
router.post("/payments/record", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.recordPaymentAndGrantPro);
router.post("/users/:id/revoke", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.revokeUserPro);

// Audit Logs
router.get("/audit-logs", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.getAuditLogs);

// Content Moderation
router.get("/reports", adminController.getReports);
router.patch("/reports/:id", adminController.updateReportStatus);
router.delete("/reports/:id/content", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.deleteReportedContent);

// Broadcasts
router.post("/broadcast", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.sendBroadcast);

// Subscription Tiers
router.get("/tiers", adminController.getTiers);
router.post("/tiers", requireAdminRoles(["SUPER_ADMIN"]), adminController.createTier);
router.patch("/tiers/:id", requireAdminRoles(["SUPER_ADMIN"]), adminController.updateTier);
router.delete("/tiers/:id", requireAdminRoles(["SUPER_ADMIN"]), adminController.deleteTier);

// GDPR Export
router.post("/users/:id/export", adminController.requestUserDataExport);

// IP Bans
router.get("/ip-bans", adminController.getIpBans);
router.post("/ip-bans", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.createIpBan);
router.delete("/ip-bans/:id", requireAdminRoles(["SUPER_ADMIN", "ADMIN"]), adminController.deleteIpBan);

export default router;
