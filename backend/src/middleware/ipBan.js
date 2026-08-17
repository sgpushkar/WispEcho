import prisma from "../config/db.js";

const banCache = new Map();
const CACHE_TTL = 60 * 1000;

export async function ipBanMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  if (!ip) return next();

  const now = Date.now();
  const cached = banCache.get(ip);

  if (cached && cached.expiresAt > now) {
    if (cached.isBanned) {
      return res.status(403).json({ error: "Your IP has been banned." });
    }
    return next();
  }

  try {
    const ban = await prisma.ipBan.findUnique({ where: { ip } });
    if (ban) {
      if (ban.expiresAt && ban.expiresAt < new Date()) {
        banCache.set(ip, { isBanned: false, expiresAt: now + CACHE_TTL });
        return next();
      }
      banCache.set(ip, { isBanned: true, expiresAt: now + CACHE_TTL });
      return res.status(403).json({ error: "Your IP has been banned." });
    }
    
    banCache.set(ip, { isBanned: false, expiresAt: now + CACHE_TTL });
    next();
  } catch (err) {
    console.error("IP Ban Check Error:", err);
    next();
  }
}
