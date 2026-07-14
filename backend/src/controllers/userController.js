import prisma from "../config/db.js";

export async function updateProfile(req, res, next) {
  try {
    const { username, displayName, bio, pronouns, avatarUrl, bannerUrl, accentColor, status } = req.body;
    
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: username,
          id: { not: req.userId },
        },
      });
      if (existingUser) {
        return res.status(409).json({ error: "Username is already taken" });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { username, displayName, bio, pronouns, avatarUrl, bannerUrl, accentColor, status },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function getUserByUsername(req, res, next) {
  try {
    const user = await prisma.user.findFirst({
      where: { username: { equals: req.params.username, mode: "insensitive" } },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        pronouns: true,
        avatarUrl: true,
        bannerUrl: true,
        accentColor: true,
        status: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function searchUsers(req, res, next) {
  try {
    const q = req.query.q?.toString() || "";
    if (q.length < 1) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.userId },
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
      },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}
