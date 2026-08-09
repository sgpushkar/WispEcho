import prisma from "../config/db.js";

/**
 * Middleware to restrict access to admin roles.
 * Must be used AFTER requireAuth.
 * @param {Array<string>} allowedRoles 
 */
export function requireAdminRoles(allowedRoles = ["SUPER_ADMIN", "ADMIN", "MODERATOR"]) {
  return async (req, res, next) => {
    try {
      if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { role: true },
      });

      if (!user) return res.status(404).json({ error: "User not found" });

      if (!allowedRoles.includes(user.role) && user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
      }

      // Attach the role so controllers don't need to fetch it again
      req.userRole = user.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
