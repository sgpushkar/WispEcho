import prisma from "../config/db.js";
import { createGroupSchema } from "../utils/validators.js";
import { emitToConversation, notifyUser } from "../sockets/index.js";
import crypto from "crypto";

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

    const inviter = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { displayName: true, username: true, avatarUrl: true },
    });

    for (const memberId of validUserIds) {
      try {
        await prisma.notification.create({
          data: {
            userId: memberId,
            type: "GROUP_INVITE",
            payload: {
              groupId,
              conversationId: group.conversationId,
              groupName: group.name,
              from: inviter?.displayName || "Someone",
              avatarUrl: group.avatarUrl || inviter?.avatarUrl,
              message: `${inviter?.displayName || "Someone"} added you to ${group.name}`,
            },
          },
        });
        notifyUser(memberId, "notification:new", {
          type: "GROUP_INVITE",
          groupId,
          conversationId: group.conversationId,
          groupName: group.name,
          from: inviter?.displayName || "Someone",
          message: `${inviter?.displayName || "Someone"} added you to ${group.name}`,
        });
      } catch (err) {
        console.error("Failed to create group invite notification:", err);
      }
    }

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

function generateJoinCode(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/** POST /api/groups/:groupId/join-link — generate/rotate invite code */
export async function generateJoinLink(req, res, next) {
  try {
    const { groupId } = req.params;
    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const joinCode = generateJoinCode();
    const group = await prisma.group.update({
      where: { id: groupId },
      data: { joinCode },
      select: { id: true, joinCode: true },
    });
    res.json({ joinCode: group.joinCode, link: `${process.env.FRONTEND_URL || ""}/join/${group.joinCode}` });
  } catch (err) {
    next(err);
  }
}

/** POST /api/groups/join/:joinCode */
export async function joinByCode(req, res, next) {
  try {
    const { joinCode } = req.params;
    const { message } = req.body;

    const group = await prisma.group.findUnique({
      where: { joinCode },
      include: { members: { select: { userId: true } } },
    });
    if (!group) return res.status(404).json({ error: "Invalid invite link" });

    const alreadyMember = group.members.some((m) => m.userId === req.userId);
    if (alreadyMember) return res.status(400).json({ error: "Already a member" });

    const currentCount = group.members.length;
    if (currentCount >= group.maxMembers) {
      return res.status(400).json({ error: "Group is full" });
    }

    if (group.requireJoinApproval) {
      // Create or update join request
      const request = await prisma.groupJoinRequest.upsert({
        where: { groupId_userId: { groupId: group.id, userId: req.userId } },
        create: { groupId: group.id, userId: req.userId, message },
        update: { status: "PENDING", message, requestedAt: new Date() },
      });
      // Notify group admins via socket
      emitToConversation(group.conversationId, "group:joinRequest", {
        groupId: group.id,
        request,
        userId: req.userId,
      });
      return res.status(202).json({ status: "PENDING", message: "Join request submitted" });
    }

    // Direct join
    await prisma.groupMember.create({ data: { groupId: group.id, userId: req.userId } });
    await prisma.conversationParticipant.create({
      data: { conversationId: group.conversationId, userId: req.userId },
    });

    emitToConversation(group.conversationId, "group:membersAdded", {
      groupId: group.id,
      userIds: [req.userId],
    });
    res.status(201).json({ status: "JOINED", conversationId: group.conversationId });
  } catch (err) {
    next(err);
  }
}

/** GET /api/groups/:groupId/join-requests */
export async function getJoinRequests(req, res, next) {
  try {
    const { groupId } = req.params;
    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const requests = await prisma.groupJoinRequest.findMany({
      where: { groupId, status: "PENDING" },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { requestedAt: "asc" },
    });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

/** POST /api/groups/:groupId/join-requests/:requestId/approve */
export async function approveJoinRequest(req, res, next) {
  try {
    const { groupId, requestId } = req.params;
    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const request = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.groupId !== groupId) return res.status(404).json({ error: "Request not found" });

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const currentCount = await prisma.groupMember.count({ where: { groupId } });
    if (currentCount >= group.maxMembers) {
      return res.status(400).json({ error: "Group is full" });
    }

    await prisma.$transaction([
      prisma.groupJoinRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedById: req.userId, reviewedAt: new Date() },
      }),
      prisma.groupMember.create({ data: { groupId, userId: request.userId } }),
      prisma.conversationParticipant.create({
        data: { conversationId: group.conversationId, userId: request.userId },
      }),
    ]);

    emitToConversation(group.conversationId, "group:membersAdded", { groupId, userIds: [request.userId] });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** POST /api/groups/:groupId/join-requests/:requestId/reject */
export async function rejectJoinRequest(req, res, next) {
  try {
    const { groupId, requestId } = req.params;
    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedById: req.userId, reviewedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/groups/:groupId/settings */
export async function updateGroupSettings(req, res, next) {
  try {
    const { groupId } = req.params;
    const { isAnnouncementOnly, maxMembers, requireJoinApproval } = req.body;

    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (maxMembers !== undefined && (maxMembers < 2 || maxMembers > 10000)) {
      return res.status(400).json({ error: "maxMembers must be between 2 and 10000" });
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(isAnnouncementOnly !== undefined && { isAnnouncementOnly }),
        ...(maxMembers !== undefined && { maxMembers }),
        ...(requireJoinApproval !== undefined && { requireJoinApproval }),
      },
    });

    emitToConversation(group.conversationId, "group:settingsUpdated", { group });
    res.json({ group });
  } catch (err) {
    next(err);
  }
}

/** POST /api/groups/:groupId/events */
export async function createGroupEvent(req, res, next) {
  try {
    const { groupId } = req.params;
    const { title, description, location, startsAt, endsAt } = req.body;

    if (!title || !startsAt) return res.status(400).json({ error: "title and startsAt are required" });

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ error: "Not a group member" });

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const event = await prisma.groupEvent.create({
      data: { groupId, createdById: req.userId, title, description, location, startsAt: new Date(startsAt), endsAt: endsAt ? new Date(endsAt) : null },
      include: { createdBy: { select: { id: true, displayName: true, avatarUrl: true } } },
    });

    emitToConversation(group.conversationId, "group:eventCreated", { event });
    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

/** GET /api/groups/:groupId/events */
export async function getGroupEvents(req, res, next) {
  try {
    const { groupId } = req.params;
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ error: "Not a group member" });

    const events = await prisma.groupEvent.findMany({
      where: { groupId },
      orderBy: { startsAt: "asc" },
      include: { createdBy: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/groups/:groupId/events/:eventId */
export async function deleteGroupEvent(req, res, next) {
  try {
    const { groupId, eventId } = req.params;
    const event = await prisma.groupEvent.findUnique({ where: { id: eventId } });
    if (!event || event.groupId !== groupId) return res.status(404).json({ error: "Event not found" });

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ error: "Not a member" });
    if (event.createdById !== req.userId && !["OWNER", "ADMIN"].includes(member.role)) {
      return res.status(403).json({ error: "Not authorized to delete this event" });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    await prisma.groupEvent.delete({ where: { id: eventId } });

    if (group) emitToConversation(group.conversationId, "group:eventDeleted", { eventId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/conversations/:conversationId/disappear */
export async function setDisappearTimer(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { disappearAfter } = req.body; // OFF | H24 | D7 | D30

    const valid = ["OFF", "H24", "D7", "D30"];
    if (!valid.includes(disappearAfter)) {
      return res.status(400).json({ error: `disappearAfter must be one of: ${valid.join(", ")}` });
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { disappearAfter },
    });

    emitToConversation(conversationId, "conversation:disappearUpdated", { conversationId, disappearAfter });
    res.json({ disappearAfter: updated.disappearAfter });
  } catch (err) {
    next(err);
  }
}
