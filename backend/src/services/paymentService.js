import prisma from "../config/db.js";
import { grantPro } from "./subscriptionService.js";
import { logAdminAction } from "./adminAuditService.js";

/**
 * Records a manual payment (e.g. UPI) and optionally grants Pro access.
 */
export async function recordManualPayment({
  adminId,
  userId,
  amount,
  currency = "INR",
  method = "UPI",
  reference = "",
  notes = "",
  grantProDays = 30, // 0 means don't grant Pro
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create Payment Record
    const payment = await tx.payment.create({
      data: {
        userId,
        amount,
        currency,
        method,
        status: "PAID",
        reference,
        verifiedByAdminId: adminId,
        paidAt: new Date(),
        notes,
      },
    });

    let subscription = null;

    // 2. Grant Pro if requested
    if (grantProDays > 0) {
      // Note: We use the imported grantPro but run the DB ops inside the tx conceptually.
      // Since grantPro is not tx-aware currently, we'll implement it inline here for atomicity,
      // or we can just call it since it upserts. For perfect atomicity, inline is better:
      const currentSub = await tx.subscription.findUnique({ where: { userId } });
      let newExpiresAt = new Date(Date.now() + grantProDays * 24 * 60 * 60 * 1000);
      
      if (currentSub && currentSub.status === "ACTIVE" && currentSub.expiresAt && currentSub.expiresAt > new Date()) {
        newExpiresAt = new Date(currentSub.expiresAt.getTime() + grantProDays * 24 * 60 * 60 * 1000);
      }

      subscription = await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: "PRO",
          status: "ACTIVE",
          source: "UPI_MANUAL",
          provider: method,
          paymentId: payment.id,
          grantedByAdminId: adminId,
          notes: `Granted ${grantProDays} days via manual payment ${payment.id}. ${notes}`,
          expiresAt: newExpiresAt,
        },
        update: {
          plan: "PRO",
          status: "ACTIVE",
          source: "UPI_MANUAL",
          provider: method,
          paymentId: payment.id,
          grantedByAdminId: adminId,
          notes: `Granted ${grantProDays} days via manual payment ${payment.id}. ${notes}\n${currentSub?.notes || ""}`,
          expiresAt: newExpiresAt,
        },
      });

      // Update payment to link back
      await tx.payment.update({
        where: { id: payment.id },
        data: { subscriptionId: subscription.id },
      });

      // Update user flag
      await tx.user.update({
        where: { id: userId },
        data: { isPro: true },
      });
    }

    // 3. Log Audit
    await tx.adminAuditLog.create({
      data: {
        adminId,
        action: "RECORD_MANUAL_PAYMENT",
        targetUserId: userId,
        targetResourceId: payment.id,
        metadata: {
          amount,
          currency,
          method,
          reference,
          grantProDays,
          subscriptionId: subscription?.id,
        },
      },
    });

    return { payment, subscription };
  });
}
