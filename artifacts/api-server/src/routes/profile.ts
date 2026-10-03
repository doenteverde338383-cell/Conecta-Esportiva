import { alias, and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { db, sportChallenges, sportChallengeParticipants, sportFollows, sportProfiles, sportVideos, sportVideoComments, sportVideoLikes, sportVideoMedia, sportVideoStars, sportInvitations } from "@workspace/db";
import { getUserId, requireAuth } from "../middlewares/auth";

const router = Router();

function normalizeProfile(row: typeof sportProfiles.$inferSelect | undefined) {
  if (!row) return null;
  return { ...row, photoUrl: row.photoPath ? `/api/storage${row.photoPath}` : null };
}

router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  const [profile] = await db.select().from(sportProfiles).where(eq(sportProfiles.userId, getUserId(req))).limit(1);
  res.json({ profile: normalizeProfile(profile) });
});

router.put("/profile", requireAuth, async (req: Request, res: Response) => {
  const { name, username, age, sport, role, city, photoPath } = req.body ?? {};
  if (
    typeof name !== "string" || name.trim().length < 2 ||
    typeof username !== "string" || !/^[a-z0-9_]{3,30}$/i.test(username) ||
    !Number.isInteger(age) || age < 13 || age > 110 ||
    typeof sport !== "string" || !sport.trim() ||
    (role !== "athlete" && role !== "teacher" && role !== "spectator") ||
    (photoPath !== undefined && photoPath !== null && (typeof photoPath !== "string" || !photoPath.startsWith("/objects/")))
  ) {
    res.status(400).json({ error: "Complete name, username, age, sport and account type are required" });
    return;
  }
  const userId = getUserId(req);
  const values = {
    userId,
    name: name.trim(),
    username: username.trim().toLowerCase(),
    age,
    sport: sport.trim(),
    role,
    city: typeof city === "string" && city.trim() ? city.trim() : null,
    photoPath: photoPath || null,
    updatedAt: new Date(),
  };
  try {
    const [profile] = await db.insert(sportProfiles).values(values).onConflictDoUpdate({
      target: sportProfiles.userId,
      set: values,
    }).returning();
    res.json({ profile: normalizeProfile(profile) });
  } catch (error) {
    if (String(error).includes("sport_profiles_username_idx")) {
      res.status(409).json({ error: "Username is already in use" });
      return;
    }
    req.log.error({ err: error }, "Could not save profile");
    res.status(500).json({ error: "Could not save profile" });
  }
});

router.get("/profiles/:username", requireAuth, async (req: Request, res: Response) => {
  const username = String(req.params.username).toLowerCase();
  const [profile] = await db.select().from(sportProfiles)
    .where(eq(sportProfiles.username, username))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const viewerId = getUserId(req);
  const [follow, followers] = await Promise.all([
    db.select({ userId: sportFollows.followerId })
      .from(sportFollows)
      .where(and(eq(sportFollows.followerId, viewerId), eq(sportFollows.followedId, profile.userId)))
      .limit(1),
    db.select({ count: sql<number>`count(*)::int` })
      .from(sportFollows)
      .where(eq(sportFollows.followedId, profile.userId)),
  ]);
  res.json({
    profile: {
      ...normalizeProfile(profile),
      following: follow.length > 0,
      followers: followers[0]?.count ?? 0,
    },
  });
});

router.get("/profile/videos", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const rows = await db.select({
    id: sportVideos.id,
    description: sportVideos.description,
    sport: sportVideos.sport,
    tags: sportVideos.tags,
    videoPath: sportVideos.videoPath,
    createdAt: sportVideos.createdAt,
    likes: sql<number>`(select count(*)::int from sport_video_likes where video_id = ${sportVideos.id})`,
    stars: sql<number>`(select count(*)::int from sport_video_stars where video_id = ${sportVideos.id})`,
    comments: sql<number>`(select count(*)::int from sport_video_comments where video_id = ${sportVideos.id})`,
  }).from(sportVideos).where(eq(sportVideos.userId, userId)).orderBy(desc(sportVideos.createdAt));
  const assets = rows.length ? await db.select().from(sportVideoMedia).where(inArray(sportVideoMedia.videoId, rows.map((row) => row.id))).orderBy(sportVideoMedia.position) : [];
  res.json({ videos: rows.map((row) => ({
    ...row,
    media: assets.filter((asset) => asset.videoId === row.id).map((asset) => ({ ...asset, url: `/api/storage${asset.objectPath}` })),
    videoUrl: `/api/storage${row.videoPath}`,
  })) });
});

router.get("/profiles/:username/videos", requireAuth, async (req: Request, res: Response) => {
  const [profile] = await db.select({ userId: sportProfiles.userId }).from(sportProfiles)
    .where(eq(sportProfiles.username, String(req.params.username).toLowerCase())).limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  const rows = await db.select({
    id: sportVideos.id,
    description: sportVideos.description,
    sport: sportVideos.sport,
    tags: sportVideos.tags,
    videoPath: sportVideos.videoPath,
    createdAt: sportVideos.createdAt,
    likes: sql<number>`(select count(*)::int from sport_video_likes where video_id = ${sportVideos.id})`,
    stars: sql<number>`(select count(*)::int from sport_video_stars where video_id = ${sportVideos.id})`,
    comments: sql<number>`(select count(*)::int from sport_video_comments where video_id = ${sportVideos.id})`,
  }).from(sportVideos).where(eq(sportVideos.userId, profile.userId)).orderBy(desc(sportVideos.createdAt));
  const assets = rows.length ? await db.select().from(sportVideoMedia).where(inArray(sportVideoMedia.videoId, rows.map((row) => row.id))).orderBy(sportVideoMedia.position) : [];
  res.json({ videos: rows.map((row) => ({
    ...row,
    media: assets.filter((asset) => asset.videoId === row.id).map((asset) => ({ ...asset, url: `/api/storage${asset.objectPath}` })),
    videoUrl: `/api/storage${row.videoPath}`,
  })) });
});

router.get("/people", requireAuth, async (req: Request, res: Response) => {
  const query = typeof req.query.query === "string" ? req.query.query.trim().toLowerCase() : "";
  const sport = typeof req.query.sport === "string" ? req.query.sport.trim().toLowerCase() : "";
  const rows = await db.select({
    userId: sportProfiles.userId,
    name: sportProfiles.name,
    username: sportProfiles.username,
    age: sportProfiles.age,
    sport: sportProfiles.sport,
    role: sportProfiles.role,
    city: sportProfiles.city,
    photoPath: sportProfiles.photoPath,
    stars: sql<number>`(select count(*)::int from sport_video_stars stars inner join sport_videos videos on videos.id = stars.video_id where videos.user_id = ${sportProfiles.userId})`,
    following: sql<boolean>`exists(select 1 from sport_follows where follower_id = ${getUserId(req)} and followed_id = ${sportProfiles.userId})`,
    followers: sql<number>`(select count(*)::int from sport_follows where followed_id = ${sportProfiles.userId})`,
  }).from(sportProfiles).orderBy(desc(sql`stars`), sportProfiles.name).limit(100);
  const filtered = rows.filter((row) =>
    (!query || `${row.name} ${row.username} ${row.sport} ${row.city ?? ""}`.toLowerCase().includes(query)) &&
    (!sport || row.sport.toLowerCase() === sport),
  );
  res.json({ people: filtered.map((row) => ({ ...row, photoUrl: row.photoPath ? `/api/storage${row.photoPath}` : null })) });
});

router.post("/people/:username/follow", requireAuth, async (req: Request, res: Response) => {
  const [target] = await db.select().from(sportProfiles).where(eq(sportProfiles.username, String(req.params.username).toLowerCase())).limit(1);
  if (!target) { res.status(404).json({ error: "Profile not found" }); return; }
  const followerId = getUserId(req);
  if (target.userId === followerId) { res.status(400).json({ error: "You cannot follow yourself" }); return; }
  const [current] = await db.select().from(sportFollows).where(and(eq(sportFollows.followerId, followerId), eq(sportFollows.followedId, target.userId))).limit(1);
  if (current) await db.delete(sportFollows).where(and(eq(sportFollows.followerId, followerId), eq(sportFollows.followedId, target.userId)));
  else await db.insert(sportFollows).values({ followerId, followedId: target.userId });
  const [followers] = await db.select({ count: sql<number>`count(*)::int` })
    .from(sportFollows).where(eq(sportFollows.followedId, target.userId));
  res.json({ following: !current, followers: followers?.count ?? 0 });
});

router.post("/people/:username/invitations", requireAuth, async (req: Request, res: Response) => {
  const senderId = getUserId(req);
  const [teacher] = await db.select().from(sportProfiles).where(eq(sportProfiles.userId, senderId)).limit(1);
  const [athlete] = await db.select().from(sportProfiles).where(eq(sportProfiles.username, String(req.params.username).toLowerCase())).limit(1);
  if (!teacher || teacher.role !== "teacher") { res.status(403).json({ error: "Only teachers can invite athletes" }); return; }
  if (!athlete || athlete.role !== "athlete") { res.status(404).json({ error: "Athlete profile not found" }); return; }
  if (athlete.userId === senderId) { res.status(400).json({ error: "You cannot invite yourself" }); return; }
  const kind = req.body?.kind;
  if (kind !== "championship" && kind !== "training_school") {
    res.status(400).json({ error: "Invitation type must be training_school or championship" });
    return;
  }
  const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 500) : "";
  const [invitation] = await db.insert(sportInvitations).values({
    id: randomUUID(), teacherId: senderId, athleteId: athlete.userId, kind,
    message: message || (kind === "championship" ? "Convite para participar de um campeonato." : "Convite para conhecer a escolinha."),
  }).returning();
  res.status(201).json({ invitation });
});

router.get("/profile/invitations", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const inviter = alias(sportProfiles, "invitation_teacher");
  const teacherInvitations = await db.select({
    id: sportInvitations.id,
    category: sql<"teacher">`'teacher'`,
    kind: sportInvitations.kind,
    message: sportInvitations.message,
    senderName: inviter.name,
    senderUsername: inviter.username,
    createdAt: sportInvitations.createdAt,
  }).from(sportInvitations)
    .innerJoin(inviter, eq(inviter.userId, sportInvitations.teacherId))
    .where(and(eq(sportInvitations.athleteId, userId), eq(sportInvitations.status, "pending")));

  const host = alias(sportProfiles, "challenge_host");
  const challengeInvitations = await db.select({
    id: sportChallenges.id,
    category: sql<"challenge">`'challenge'`,
    kind: sql<string>`'challenge'`,
    message: sportChallenges.message,
    senderName: host.name,
    senderUsername: host.username,
    challengeType: sportChallenges.type,
    sport: sportChallenges.sport,
    date: sportChallenges.date,
    time: sportChallenges.time,
    location: sportChallenges.location,
    createdAt: sportChallenges.createdAt,
  }).from(sportChallengeParticipants)
    .innerJoin(sportChallenges, eq(sportChallenges.id, sportChallengeParticipants.challengeId))
    .innerJoin(host, eq(host.userId, sportChallenges.creatorId))
    .where(and(eq(sportChallengeParticipants.userId, userId), eq(sportChallengeParticipants.status, "invited")));

  const invitations = [
    ...teacherInvitations.map((item) => ({ ...item, sender: item.senderName, challengeId: null })),
    ...challengeInvitations.map((item) => ({ ...item, sender: item.senderName, challengeId: item.id })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ invitations });
});

router.patch("/profile/invitations/:id", requireAuth, async (req: Request, res: Response) => {
  const action = req.body?.action;
  if (action !== "accept" && action !== "decline") {
    res.status(400).json({ error: "Choose accept or decline" });
    return;
  }
  const [athlete] = await db.select({ role: sportProfiles.role }).from(sportProfiles)
    .where(eq(sportProfiles.userId, getUserId(req))).limit(1);
  if (!athlete || athlete.role !== "athlete") { res.status(403).json({ error: "Only athlete accounts can respond to teacher invitations" }); return; }
  const [invitation] = await db.select({ id: sportInvitations.id }).from(sportInvitations)
    .where(and(eq(sportInvitations.id, String(req.params.id)), eq(sportInvitations.athleteId, getUserId(req)), eq(sportInvitations.status, "pending")))
    .limit(1);
  if (!invitation) { res.status(404).json({ error: "Invitation not found" }); return; }
  await db.update(sportInvitations).set({ status: action === "accept" ? "accepted" : "declined" })
    .where(eq(sportInvitations.id, invitation.id));
  res.json({ status: action === "accept" ? "accepted" : "declined" });
});

export default router;