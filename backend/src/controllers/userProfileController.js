import prisma from "../config/db.js";

const sanitize = (user) => {
  const { password, googleId, refreshTokens, emailTokens, ...safe } = user;
  return safe;
};

/** GET /api/users/:userId/profile */
export async function getUserProfile(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        pronouns: true,
        socialLinks: true,
        accentColor: true,
        status: true,
        isPro: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Mutual friends count
    const [myFriends, theirFriends] = await Promise.all([
      prisma.friendship.findMany({
        where: { status: "ACCEPTED", OR: [{ requesterId: req.userId }, { addresseeId: req.userId }] },
        select: { requesterId: true, addresseeId: true },
      }),
      prisma.friendship.findMany({
        where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: { requesterId: true, addresseeId: true },
      }),
    ]);

    const myFriendIds = new Set(
      myFriends.map((f) => (f.requesterId === req.userId ? f.addresseeId : f.requesterId))
    );
    const theirFriendIds = new Set(
      theirFriends.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId))
    );
    const mutualCount = [...myFriendIds].filter((id) => theirFriendIds.has(id)).length;

    // Friendship status between viewer and this user
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId: userId },
          { requesterId: userId, addresseeId: req.userId },
        ],
      },
    });

    res.json({ user, mutualFriendsCount: mutualCount, friendship: friendship || null });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/users/me/profile */
export async function updateMyProfile(req, res, next) {
  try {
    const { bio, pronouns, socialLinks, displayName, status, accentColor } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(bio !== undefined && { bio }),
        ...(pronouns !== undefined && { pronouns }),
        ...(socialLinks !== undefined && { socialLinks }),
        ...(displayName !== undefined && { displayName }),
        ...(status !== undefined && { status }),
        ...(accentColor !== undefined && { accentColor }),
      },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true, bannerUrl: true,
        bio: true, pronouns: true, socialLinks: true, accentColor: true, status: true,
        isPro: true, isOnline: true, lastSeen: true, createdAt: true,
      },
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}
