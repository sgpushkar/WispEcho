import prisma from "../config/db.js";
import { recordManualPayment } from "../services/paymentService.js";
import { grantPro, revokePro } from "../services/subscriptionService.js";

// --- Dashboard ---
export async function getDashboardStats(req, res, next) {
  try {
    const totalUsers = await prisma.user.count();
    const activeProUsers = await prisma.subscription.count({
      where: { status: "ACTIVE" },
    });
    
    // Revenue from manual payments (assuming INR for now)
    const totalPayments = await prisma.payment.aggregate({
      where: { status: "PAID", currency: "INR" },
      _sum: { amount: true },
    });

    res.json({
      totalUsers,
      activeProUsers,
      totalRevenueINR: totalPayments._sum.amount || 0,
    });
  } catch (err) {
    next(err);
  }
}

// --- Users ---
export async function listUsers(req, res, next) {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, username: true, displayName: true,
          role: true, isPro: true, createdAt: true, lastSeen: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

export async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        payments: { orderBy: { createdAt: "desc" } },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Sanitize user
    delete user.password;
    delete user.googleId;
    
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (req.userRole !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only SUPER_ADMIN can change roles" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    res.json({ success: true, role: user.role });
  } catch (err) {
    next(err);
  }
}

// --- Payments & Subscriptions ---
export async function recordPaymentAndGrantPro(req, res, next) {
  try {
    const { userId, amount, reference, notes, grantProDays } = req.body;
    
    const result = await recordManualPayment({
      adminId: req.userId,
      userId,
      amount: Number(amount),
      reference,
      notes,
      grantProDays: Number(grantProDays || 0),
    });

    res.json({ success: true, payment: result.payment, subscription: result.subscription });
  } catch (err) {
    next(err);
  }
}

export async function revokeUserPro(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const sub = await revokePro({ userId: id, revokedByAdminId: req.userId, reason });
    res.json({ success: true, subscription: sub });
  } catch (err) {
    next(err);
  }
}

// --- Audit Logs ---
export async function getAuditLogs(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          admin: { select: { id: true, username: true, email: true } },
        },
      }),
      prisma.adminAuditLog.count(),
    ]);

    res.json({ logs, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
}
