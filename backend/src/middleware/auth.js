import prisma from "../config/db.js";
import { verifyAccessToken } from "../utils/token.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;

  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isBanned: true, bannedUntil: true }
    });

    if (!user) return res.status(401).json({ error: "User not found" });

    if (user.isBanned) {
      return res.status(403).json({ error: "Account permanently banned." });
    }
    if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
      return res.status(403).json({ error: `Account suspended until ${new Date(user.bannedUntil).toLocaleString()}` });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
