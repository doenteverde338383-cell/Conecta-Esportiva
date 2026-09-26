import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { db, sportChallenges, sportChallengeParticipants, sportProfiles } from "@workspace/db";
import { getUserId, requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/challenges", requireAuth, async (_req: Request, res: Response) => {
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
  res.json({ challenges: rows.map((row) => ({ ...row, participantCount: row.participants.length })) });
});

router.post("/challenges", requireAuth, async (req: Request, res: Response) => {
  const { sport, type, date, time, location, message } = req.body ?? {};
  if ([sport, type, date, time, location, message].some((value) => typeof value !== "string" || !value.trim())) {
    res.status(400).json({ error: "Sport, format, date, time, location and message are required" });
    return;
  }
  const [challenge] = await db.insert(sportChallenges).values({
    id: randomUUID(),
    creatorId: getUserId(req),
    sport: sport.trim(),
    type: type.trim(),
    date: date.trim(),
    time: time.trim(),
    location: location.trim(),
    message: message.trim(),
    participants: [getUserId(req)],
  }).returning();
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
  res.json({ challenge: { ...row, participantCount: row.participants.length, joined: row.participants.includes(getUserId(req)) } });
});

router.post("/challenges/:id/join", requireAuth, async (req: Request, res: Response) => {
  const challengeId = String(req.params.id);
  const userId = getUserId(req);
  const [existing] = await db.select().from(sportChallengeParticipants).where(and(eq(sportChallengeParticipants.challengeId, challengeId), eq(sportChallengeParticipants.userId, userId))).limit(1);
  if (existing) {
    await db.delete(sportChallengeParticipants).where(and(eq(sportChallengeParticipants.challengeId, challengeId), eq(sportChallengeParticipants.userId, userId)));
    const [challenge] = await db.select({ participants: sportChallenges.participants }).from(sportChallenges).where(eq(sportChallenges.id, challengeId)).limit(1);
    if (challenge) await db.update(sportChallenges).set({ participants: challenge.participants.filter((id) => id !== userId) }).where(eq(sportChallenges.id, challengeId));
  } else {
    await db.insert(sportChallengeParticipants).values({ challengeId, userId, status: "joined" });
    const [challenge] = await db.select({ participants: sportChallenges.participants }).from(sportChallenges).where(eq(sportChallenges.id, challengeId)).limit(1);
    if (challenge && !challenge.participants.includes(userId)) await db.update(sportChallenges).set({ participants: [...challenge.participants, userId] }).where(eq(sportChallenges.id, challengeId));
  }
  res.json({ joined: !existing });
});

export default router;