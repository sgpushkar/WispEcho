import prisma from "../config/db.js";

// Get subscription status for current user
export async function getSubscription(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isPro: true },
    });

    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.userId },
    });

    res.json({
      isPro: user?.isPro || false,
      subscription: subscription || { plan: "free", status: "active" },
    });
  } catch (err) {
    next(err);
  }
}

// Activate Pro (placeholder — will be connected to payment gateway later)
export async function activatePro(req, res, next) {
  try {
    const { plan } = req.body; // "pro" | "pro_yearly"

    // In production, this would verify payment with Stripe/Razorpay
    // For now, directly activate for development/testing
    const subscription = await prisma.subscription.upsert({
      where: { userId: req.userId },
      create: {
        userId: req.userId,
        plan: plan || "pro",
        status: "active",
        expiresAt: plan === "pro_yearly"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        plan: plan || "pro",
        status: "active",
        expiresAt: plan === "pro_yearly"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: req.userId },
      data: { isPro: true },
    });

    res.json({ subscription, isPro: true });
  } catch (err) {
    next(err);
  }
}

// Cancel subscription
export async function cancelSubscription(req, res, next) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.userId },
    });

    if (!subscription) {
      return res.status(404).json({ error: "No active subscription" });
    }

    await prisma.subscription.update({
      where: { userId: req.userId },
      data: { status: "cancelled" },
    });

    // isPro remains true until expiry — a cron job would handle expiry in production
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// User claims to have manually paid via UPI
export async function claimManualPayment(req, res, next) {
  try {
    const { amount = 39, reference = "" } = req.body;

    const payment = await prisma.payment.create({
      data: {
        userId: req.userId,
        amount: amount,
        currency: "INR",
        method: "UPI",
        status: "PENDING",
        reference: reference,
        notes: "Claimed manual UPI payment via app",
      },
    });

    res.json({ success: true, payment });
  } catch (err) {
    next(err);
  }
}
