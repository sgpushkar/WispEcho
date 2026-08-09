import prisma from "../config/db.js";

/**
 * Checks if a user has an active Pro subscription.
 * If the subscription has expired, it automatically updates the user's isPro status.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasActivePro(userId) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub || sub.status !== "ACTIVE") {
    // Sync the User flag to false if it's stale
    await syncUserProStatus(userId, false);
    return false;
  }

  if (sub.expiresAt && sub.expiresAt < new Date()) {
    // Subscription expired naturally
    await prisma.subscription.update({
      where: { userId },
      data: { status: "EXPIRED" },
    });
    await syncUserProStatus(userId, false);
    return false;
  }

  // Active and not expired
  await syncUserProStatus(userId, true);
  return true;
}

/**
 * Utility to keep the `User.isPro` boolean in sync with the Subscription truth.
 * This ensures queries that rely on User.isPro don't break.
 */
async function syncUserProStatus(userId, shouldBePro) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true },
  });

  if (user && user.isPro !== shouldBePro) {
    await prisma.user.update({
      where: { id: userId },
      data: { isPro: shouldBePro },
    });
  }
}
