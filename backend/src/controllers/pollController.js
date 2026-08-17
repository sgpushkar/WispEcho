import prisma from "../config/db.js";
import { emitToConversation } from "../sockets/index.js";

/** POST /api/polls — create a poll (linked to a POLL message) */
export async function createPoll(req, res, next) {
  try {
    const { conversationId, question, options, allowMultiple = false, endsAt } = req.body;

    if (!conversationId || !question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: "conversationId, question, and at least 2 options are required" });
    }
    if (options.length > 10) {
      return res.status(400).json({ error: "Maximum 10 options allowed" });
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    // Check announcement-only groups — only admins/owners can post
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { group: true },
    });
    if (conv?.isGroup && conv.group?.isAnnouncementOnly) {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: conv.group.id, userId: req.userId } },
      });
      if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
        return res.status(403).json({ error: "Only admins can post in announcement channels" });
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.userId,
        type: "POLL",
        content: question,
        poll: {
          create: {
            conversationId,
            createdById: req.userId,
            question,
            options,
            allowMultiple,
            endsAt: endsAt ? new Date(endsAt) : null,
          },
        },
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        poll: { include: { votes: true } },
      },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    emitToConversation(conversationId, "message:new", message);

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

/** GET /api/polls/:pollId */
export async function getPoll(req, res, next) {
  try {
    const { pollId } = req.params;
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { votes: true },
    });
    if (!poll) return res.status(404).json({ error: "Poll not found" });

    // Auth check — must be conversation participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: poll.conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    res.json({ poll: formatPoll(poll, req.userId) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/polls/:pollId/vote */
export async function votePoll(req, res, next) {
  try {
    const { pollId } = req.params;
    const { optionIndexes } = req.body; // number[]

    if (!Array.isArray(optionIndexes) || optionIndexes.length === 0) {
      return res.status(400).json({ error: "optionIndexes must be a non-empty array" });
    }

    const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { votes: true } });
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    if (poll.closedAt) return res.status(400).json({ error: "Poll is closed" });
    if (poll.endsAt && new Date(poll.endsAt) < new Date()) return res.status(400).json({ error: "Poll has ended" });

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: poll.conversationId, userId: req.userId } },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant" });

    if (!poll.allowMultiple && optionIndexes.length > 1) {
      return res.status(400).json({ error: "This poll does not allow multiple selections" });
    }

    const maxIndex = JSON.parse(JSON.stringify(poll.options)).length - 1;
    if (optionIndexes.some((i) => i < 0 || i > maxIndex)) {
      return res.status(400).json({ error: "Invalid option index" });
    }

    // Upsert vote
    const vote = await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId: req.userId } },
      create: { pollId, userId: req.userId, optionIndexes },
      update: { optionIndexes },
    });

    // Re-fetch updated poll and emit
    const updatedPoll = await prisma.poll.findUnique({ where: { id: pollId }, include: { votes: true } });
    emitToConversation(poll.conversationId, "poll:updated", { pollId, poll: formatPoll(updatedPoll, req.userId) });

    res.json({ vote, poll: formatPoll(updatedPoll, req.userId) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/polls/:pollId/close — creator closes early */
export async function closePoll(req, res, next) {
  try {
    const { pollId } = req.params;
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    if (poll.createdById !== req.userId) return res.status(403).json({ error: "Only poll creator can close it" });

    const updated = await prisma.poll.update({
      where: { id: pollId },
      data: { closedAt: new Date() },
      include: { votes: true },
    });

    emitToConversation(poll.conversationId, "poll:updated", { pollId, poll: formatPoll(updated, req.userId) });
    res.json({ poll: formatPoll(updated, req.userId) });
  } catch (err) {
    next(err);
  }
}

function formatPoll(poll, currentUserId) {
  const options = JSON.parse(JSON.stringify(poll.options));
  const results = options.map((label, idx) => ({
    index: idx,
    label,
    votes: poll.votes.filter((v) => v.optionIndexes.includes(idx)).length,
    voters: poll.votes.filter((v) => v.optionIndexes.includes(idx)).map((v) => v.userId),
  }));
  const myVote = poll.votes.find((v) => v.userId === currentUserId);
  return {
    id: poll.id,
    messageId: poll.messageId,
    question: poll.question,
    options,
    allowMultiple: poll.allowMultiple,
    endsAt: poll.endsAt,
    closedAt: poll.closedAt,
    results,
    myVote: myVote?.optionIndexes ?? null,
    totalVotes: poll.votes.length,
  };
}
