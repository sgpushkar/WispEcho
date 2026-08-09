import prisma from "../config/db.js";
import { notifyUser } from "../sockets/index.js";
import { hasActivePro } from "./entitlementService.js";

/**
 * Grants or extends a Pro subscription for a user.
 */
export async function grantPro({
  userId,
  plan = "PRO",
  source = "ADMIN",
  provider = "NONE",
  paymentId = null,
  grantedByAdminId = null,
  durationDays = 30,
  notes = "",
}) {
  const currentSub = await prisma.subscription.findUnique({ where: { userId } });
  
  let newExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  
  // If they already have an active sub, extend it instead of replacing it entirely
  if (currentSub && currentSub.status === "ACTIVE" && currentSub.expiresAt && currentSub.expiresAt > new Date()) {
    newExpiresAt = new Date(currentSub.expiresAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      status: "ACTIVE",
      source,
      provider,
      paymentId,
      grantedByAdminId,
      notes,
      expiresAt: newExpiresAt,
    },
    update: {
      plan,
      status: "ACTIVE",
      source,
      provider,
      paymentId: paymentId || currentSub.paymentId,
      grantedByAdminId,
      notes,
      expiresAt: newExpiresAt,
    },
  });

  // Sync the user flag
  await hasActivePro(userId);

  // Notify the user in real-time
  notifyUser(userId, "subscription:updated", { 
    isPro: true, 
    subscription 
  });

  return subscription;
}

/**
 * Instantly revokes a Pro subscription.
 */
export async function revokePro({ userId, revokedByAdminId = null, reason = "" }) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) return null;

  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      status: "REVOKED",
      notes: reason ? `Revoked: ${reason}\n${subscription.notes || ""}` : subscription.notes,
    },
  });

  await hasActivePro(userId);

  notifyUser(userId, "subscription:updated", { 
    isPro: false, 
    subscription: updated 
  });

  return updated;
}
