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

    const pendingPayments = await prisma.payment.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    res.json({
      totalUsers,
      activeProUsers,
      totalRevenueINR: totalPayments._sum.amount || 0,
      pendingPayments,
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

    // Sanitize — use destructuring so PII fields are never sent
    const { password, googleId, ...safeUser } = user as any;
    
    res.json({ user: safeUser });
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

// --- Moderation ---
export async function warnUser(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    let newWarningCount = user.warningCount + 1;
    let data = { warningCount: newWarningCount };

    // 3 warnings = 7 day suspension
    if (newWarningCount === 3) {
      data.bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      data.banReason = "Suspended automatically after 3 warnings.";
    } 
    // 4+ warnings = permanent ban
    else if (newWarningCount >= 4) {
      data.isBanned = true;
      data.banReason = "Banned automatically after 4+ warnings.";
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.userId,
        action: "WARN_USER",
        targetUserId: id,
        metadata: { reason, newWarningCount, autoSuspended: newWarningCount === 3, autoBanned: newWarningCount >= 5 },
        ipAddress: req.ip,
      },
    });

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    next(err);
  }
}

export async function suspendUser(req, res, next) {
  try {
    const { id } = req.params;
    const { reason, days } = req.body;
    const numDays = Number(days);
    if (!numDays || numDays <= 0 || !Number.isFinite(numDays)) {
      return res.status(400).json({ error: "'days' must be a positive number" });
    }

    const bannedUntil = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000);

    const user = await prisma.user.update({
      where: { id },
      data: { bannedUntil, banReason: reason },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.userId,
        action: "SUSPEND_USER",
        targetUserId: id,
        metadata: { reason, days, bannedUntil },
        ipAddress: req.ip,
      },
    });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function banUser(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: true, banReason: reason },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.userId,
        action: "BAN_USER",
        targetUserId: id,
        metadata: { reason },
        ipAddress: req.ip,
      },
    });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    
    // Soft delete: scrub PII and set isDeleted flag so messages remain intact
    const user = await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        displayName: "Deleted User",
        email: `deleted_${id}@example.com`,
        username: `deleted_${id}`,
        password: null,
        googleId: null,
        avatarUrl: null,
        bio: null,
        isBanned: true, // effectively lock them out
        banReason: "Account deleted",
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.userId,
        action: "DELETE_USER",
        targetUserId: id,
        metadata: { softDelete: true },
        ipAddress: req.ip,
      },
    });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}
