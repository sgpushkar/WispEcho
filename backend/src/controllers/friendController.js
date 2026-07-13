import prisma from "../config/db.js";
import { notifyUser } from "../sockets/index.js";

export async function sendFriendRequest(req, res, next) {
  try {
    const { addresseeId } = req.body;
    if (addresseeId === req.userId) {
      return res.status(400).json({ error: "Can't friend yourself" });
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId },
          { requesterId: addresseeId, addresseeId: req.userId },
        ],
      },
    });
    if (existing) return res.status(409).json({ error: "Friendship already exists or pending" });

    const friendship = await prisma.friendship.create({
      data: { requesterId: req.userId, addresseeId, status: "PENDING" },
    });

    const requester = await prisma.user.findUnique({ where: { id: req.userId } });
    await prisma.notification.create({
      data: {
        userId: addresseeId,
        type: "FRIEND_REQUEST",
        payload: { friendshipId: friendship.id, from: requester.username },
      },
    });
    notifyUser(addresseeId, "notification:new", {
      type: "FRIEND_REQUEST",
      from: requester,
    });

    res.status(201).json({ friendship });
  } catch (err) {
    next(err);
  }
}

export async function respondFriendRequest(req, res, next) {
  try {
    const { friendshipId } = req.params;
    const { action } = req.body; // "accept" | "reject"

    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.addresseeId !== req.userId) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    if (action === "accept") {
      const updated = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "ACCEPTED" },
      });
      notifyUser(friendship.requesterId, "friend:accepted", { friendshipId });
      return res.json({ friendship: updated });
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function blockUser(req, res, next) {
  try {
    const { userId } = req.body;
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId: userId },
          { requesterId: userId, addresseeId: req.userId },
        ],
      },
    });

    if (existing) {
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "BLOCKED", requesterId: req.userId, addresseeId: userId },
      });
    } else {
      await prisma.friendship.create({
        data: { requesterId: req.userId, addresseeId: userId, status: "BLOCKED" },
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listFriends(req, res, next) {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: req.userId }, { addresseeId: req.userId }],
      },
      include: { requester: true, addressee: true },
    });

    const friends = friendships.map((f) => {
      const friend = f.requesterId === req.userId ? f.addressee : f.requester;
      const { password, googleId, ...safe } = friend;
      return safe;
    });

    res.json({ friends });
  } catch (err) {
    next(err);
  }
}

export async function listPendingRequests(req, res, next) {
  try {
    const incoming = await prisma.friendship.findMany({
      where: { addresseeId: req.userId, status: "PENDING" },
      include: { requester: true },
    });
    const outgoing = await prisma.friendship.findMany({
      where: { requesterId: req.userId, status: "PENDING" },
      include: { addressee: true },
    });
    res.json({ incoming, outgoing });
  } catch (err) {
    next(err);
  }
}
