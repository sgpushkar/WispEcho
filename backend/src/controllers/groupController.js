import prisma from "../config/db.js";
import { createGroupSchema } from "../utils/validators.js";
import { emitToConversation } from "../sockets/index.js";

export async function createGroup(req, res, next) {
  try {
    const data = createGroupSchema.parse(req.body);
    const allMemberIds = [...new Set([...data.memberIds, req.userId])];

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: true,
        participants: { create: allMemberIds.map((userId) => ({ userId })) },
        group: {
          create: {
            name: data.name,
            description: data.description,
            members: {
              create: allMemberIds.map((userId) => ({
                userId,
                role: userId === req.userId ? "OWNER" : "MEMBER",
              })),
            },
          },
        },
      },
      include: { group: { include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } } } } },
    });

    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

export async function inviteMembers(req, res, next) {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;

    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
      return res.status(403).json({ error: "Not authorized to invite" });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const blocks = await prisma.friendship.findMany({
      where: {
        status: "BLOCKED",
        OR: [
          { requesterId: req.userId, addresseeId: { in: userIds } },
          { requesterId: { in: userIds }, addresseeId: req.userId },
        ],
      },
    });
    
    const blockedUserIds = new Set(blocks.flatMap(b => [b.requesterId, b.addresseeId]));
    const validUserIds = userIds.filter(id => !blockedUserIds.has(id));

    if (validUserIds.length === 0) {
      return res.status(403).json({ error: "Cannot invite these users due to block settings" });
    }

    await prisma.groupMember.createMany({
      data: validUserIds.map((userId) => ({ groupId, userId })),
      skipDuplicates: true,
    });
    await prisma.conversationParticipant.createMany({
      data: validUserIds.map((userId) => ({ conversationId: group.conversationId, userId })),
      skipDuplicates: true,
    });

    emitToConversation(group.conversationId, "group:membersAdded", { groupId, userIds: validUserIds });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    const { groupId, userId } = req.params;
    const { role } = req.body; // ADMIN | MODERATOR | MEMBER

    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester || requester.role !== "OWNER") {
      return res.status(403).json({ error: "Only the owner can change roles" });
    }

    const member = await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role },
    });
    res.json({ member });
  } catch (err) {
    next(err);
  }
}

export async function kickMember(req, res, next) {
  try {
    const { groupId, userId } = req.params;

    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
      return res.status(403).json({ error: "Not authorized to kick members" });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: "Group not found" });
    await prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId } } });
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: group.conversationId, userId },
    });

    emitToConversation(group.conversationId, "group:memberKicked", { groupId, userId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getGroupDetails(req, res, next) {
  try {
    const { groupId } = req.params;
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true } } } } },
    });
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json({ group });
  } catch (err) {
    next(err);
  }
}

export async function updateGroupDetails(req, res, next) {
  try {
    const { groupId } = req.params;
    const { name, description, avatarUrl } = req.body;

    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
      return res.status(403).json({ error: "Not authorized to update group" });
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: { name, description, avatarUrl },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true } } } } },
    });

    emitToConversation(group.conversationId, "group:updated", { group });
    res.json({ group });
  } catch (err) {
    next(err);
  }
}

export async function leaveGroup(req, res, next) {
  try {
    const { groupId } = req.params;

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!member) return res.status(404).json({ error: "Not a member of this group" });
    if (member.role === "OWNER") {
      return res.status(400).json({ error: "Owner cannot leave. Transfer ownership or delete the group." });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: "Group not found" });

    await prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId: req.userId } } });
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: group.conversationId, userId: req.userId },
    });

    emitToConversation(group.conversationId, "group:memberLeft", {
      groupId,
      userId: req.userId,
      conversationId: group.conversationId,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function deleteGroup(req, res, next) {
  try {
    const { groupId } = req.params;

    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester || requester.role !== "OWNER") {
      return res.status(403).json({ error: "Only the owner can delete the group" });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Notify all members before deletion so sockets can react
    emitToConversation(group.conversationId, "group:deleted", {
      groupId,
      conversationId: group.conversationId,
    });

    // Cascade: conversation deletion cascades to participants/messages via Prisma relations
    await prisma.conversation.delete({ where: { id: group.conversationId } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
