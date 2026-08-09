import prisma from "../config/db.js";

/**
 * Log an administrative action to the audit log.
 * @param {string} adminId - The ID of the admin performing the action
 * @param {string} action - Describe the action, e.g., 'GRANT_PRO', 'SUSPEND_USER', 'UPDATE_SETTING'
 * @param {object} options - Optional targets and metadata
 * @param {string} options.targetUserId - The user being affected (if applicable)
 * @param {string} options.targetResourceId - ID of a group, payment, or message (if applicable)
 * @param {object} options.metadata - Any additional JSON context (e.g. before/after states)
 * @param {string} options.ipAddress - Request IP
 * @param {string} options.userAgent - Request user agent
 */
export async function logAdminAction(adminId, action, options = {}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetUserId: options.targetUserId || null,
        targetResourceId: options.targetResourceId || null,
        metadata: options.metadata || {},
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    });
  } catch (err) {
    console.error("Failed to write to admin audit log:", err);
    // Non-blocking for the main request
  }
}
