import prisma from "../config/db.js";

export const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys, userAgent } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: req.userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        updatedAt: new Date()
      },
      create: {
        userId: req.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null
      }
    });

    res.status(200).json({ success: true, subscription });
  } catch (error) {
    next(error);
  }
};

export const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint is required" });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.userId }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
