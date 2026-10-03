import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { db, sportChallenges, sportChallengeParticipants, sportProfiles } from "@workspace/db";
import { getUserId, requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/challenges", requireAuth, async (req: Request, res: Response) => {
  const rows = await db.select({
    id: sportChallenges.id,
    sport: sportChallenges.sport,
    type: sportChallenges.type,
    date: sportChallenges.date,
    time: sportChallenges.time,
    location: sportChallenges.location,
    message: sportChallenges.message,
    participants: sportChallenges.participants,
    createdAt: sportChallenges.createdAt,
    host: sportProfiles.name,
    hostUsername: sportProfiles.username,
  }).from(sportChallenges)
    .innerJoin(sportProfiles, eq(sportProfiles.userId, sportChallenges.creatorId))
    .orderBy(desc(sportChallenges.createdAt));
  const userId = getUserId(req);
  res.json({ challenges: rows.map((row) => ({
    ...row,
    participantCount: row.participants.length,
    joined: row.participants.includes(userId),
  })) });
});

router.post("/challenges", requireAuth, async (req: Request, res: Response) => {
  const { sport, type, date, time, location, message, inviteUsername } = req.body ?? {};
  if ([sport, type, date, time, location, message].some((value) => typeof value !== "string" || !value.trim())) {
    res.status(400).json({ error: "Sport, format, date, time, location and message are required" });
    return;
  }
  const [profile] = await db.select({ role: sportProfiles.role }).from(sportProfiles).where(eq(sportProfiles.userId, getUserId(req))).limit(1);
  if (!profile) { res.status(409).json({ error: "Complete your profile before creating a challenge" }); return; }
  if (profile.role === "spectator") { res.status(403).json({ error: "Spectator accounts cannot create challenges" }); return; }
  if (!["X1", "Amistoso", "Jogo", "Campeonato"].includes(type.trim())) {
    res.status(400).json({ error: "Choose X1, Amistoso, Jogo or Campeonato" });
    return;
  }
  let inviteeId: string | undefined;
  if (typeof inviteUsername === "string" && inviteUsername.trim()) {
    const [invitee] = await db.select({ userId: sportProfiles.userId, role: sportProfiles.role })
      .from(sportProfiles).where(eq(sportProfiles.username, inviteUsername.trim().toLowerCase())).limit(1);
    if (!invitee || invitee.role !== "athlete") {
      res.status(404).json({ error: "Athlete profile not found" });
      return;
    }
    inviteeId = invitee.userId;
  }

  const userId = getUserId(req);
  const challengeId = randomUUID();
  const challenge = await db.transaction(async (tx) => {
    const [created] = await tx.insert(sportChallenges).values({
      id: challengeId,
      creatorId: userId,
      sport: sport.trim(),
      type: type.trim(),
      date: date.trim(),
      time: time.trim(),
      location: location.trim(),
      message: message.trim(),
      participants: [userId],
    }).returning();
    await tx.insert(sportChallengeParticipants).values({ challengeId, userId, status: "joined" });
    if (inviteeId) await tx.insert(sportChallengeParticipants).values({ challengeId, userId: inviteeId, status: "invited" });
    return created;
  });
  res.status(201).json({ challenge });
});

router.get("/challenges/:id", requireAuth, async (req: Request, res: Response) => {
  const [row] = await db.select({
    id: sportChallenges.id,
    sport: sportChallenges.sport,
    type: sportChallenges.type,
    date: sportChallenges.date,
    time: sportChallenges.time,
    location: sportChallenges.location,
    message: sportChallenges.message,
    participants: sportChallenges.participants,
    createdAt: sportChallenges.createdAt,
    creatorId: sportChallenges.creatorId,
    host: sportProfiles.name,
  }).from(sportChallenges).innerJoin(sportProfiles, eq(sportProfiles.userId, sportChallenges.creatorId))
    .where(eq(sportChallenges.id, String(req.params.id))).limit(1);
  if (!row) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }
  const userId = getUserId(req);
  const [membership] = await db.select({ status: sportChallengeParticipants.status })
    .from(sportChallengeParticipants)
    .where(and(eq(sportChallengeParticipants.challengeId, row.id), eq(sportChallengeParticipants.userId, userId)))
    .limit(1);
  res.json({
    challenge: {
      ...row,
      participantCount: row.participants.length,
      joined: membership?.status === "joined" || row.participants.includes(userId),
      invited: membership?.status === "invited",
    },
  });
});

router.post("/challenges/:id/invitation-response", requireAuth, async (req: Request, res: Response) => {
  const action = req.body?.action;
  if (action !== "accept" && action !== "decline") {
    res.status(400).json({ error: "Choose accept or decline" });
    return;
  }
  const userId = getUserId(req);
  const [profile] = await db.select({ role: sportProfiles.role }).from(sportProfiles)
    .where(eq(sportProfiles.userId, userId)).limit(1);
  if (!profile) { res.status(409).json({ error: "Complete your profile before responding to invitations" }); return; }
  if (profile.role === "spectator" && action === "accept") {
    res.status(403).json({ error: "Spectator accounts cannot join challenges" });
    return;
  }
  const challengeId = String(req.params.id);
  const [invitation] = await db.select({ status: sportChallengeParticipants.status })
    .from(sportChallengeParticipants)
    .where(and(
      eq(sportChallengeParticipants.challengeId, challengeId),
      eq(sportChallengeParticipants.userId, userId),
      eq(sportChallengeParticipants.status, "invited"),
    )).limit(1);
  if (!invitation) { res.status(404).json({ error: "Challenge invitation not found" }); return; }

  await db.transaction(async (tx) => {
    await tx.update(sportChallengeParticipants)
      .set({ status: action === "accept" ? "joined" : "declined" })
      .where(and(eq(sportChallengeParticipants.challengeId, challengeId), eq(sportChallengeParticipants.userId, userId)));
    if (action === "accept") {
      const [challenge] = await tx.select({ participants: sportChallenges.participants })
        .from(sportChallenges).where(eq(sportChallenges.id, challengeId)).limit(1);
      if (challenge && !challenge.participants.includes(userId)) {
        await tx.update(sportChallenges)
          .set({ participants: [...challenge.participants, userId] })
          .where(eq(sportChallenges.id, challengeId));
      }
    }
  });
  res.json({ status: action === "accept" ? "accepted" : "declined" });
});

router.post("/challenges/:id/join", requireAuth, async (req: Request, res: Response) => {
  const challengeId = String(req.params.id);
  const userId = getUserId(req);
  const [profile] = await db.select({ role: sportProfiles.role }).from(sportProfiles).where(eq(sportProfiles.userId, userId)).limit(1);
  if (profile?.role === "spectator") {
    res.status(403).json({ error: "Spectator accounts cannot join challenges" });
    return;
  }
  const [challenge] = await db.select({ participants: sportChallenges.participants })
    .from(sportChallenges).where(eq(sportChallenges.id, challengeId)).limit(1);
  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }
  const [existing] = await db.select().from(sportChallengeParticipants).where(and(eq(sportChallengeParticipants.challengeId, challengeId), eq(sportChallengeParticipants.userId, userId))).limit(1);
  if (existing?.status === "joined" || challenge.participants.includes(userId)) {
    if (existing) await db.delete(sportChallengeParticipants).where(and(eq(sportChallengeParticipants.challengeId, challengeId), eq(sportChallengeParticipants.userId, userId)));
    await db.update(sportChallenges).set({ participants: challenge.participants.filter((id) => id !== userId) }).where(eq(sportChallenges.id, challengeId));
  } else {
    if (existing) {
      await db.update(sportChallengeParticipants).set({ status: "joined" })
        .where(and(eq(sportChallengeParticipants.challengeId, challengeId), eq(sportChallengeParticipants.userId, userId)));
    } else {
      await db.insert(sportChallengeParticipants).values({ challengeId, userId, status: "joined" });
    }
    if (!challenge.participants.includes(userId)) {
      await db.update(sportChallenges).set({ participants: [...challenge.participants, userId] }).where(eq(sportChallenges.id, challengeId));
    }
  }
  res.json({ joined: existing?.status !== "joined" && !challenge.participants.includes(userId) });
});

export default router;