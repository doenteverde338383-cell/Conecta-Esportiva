import { and, desc, eq, sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { db, sportProfiles, sportVideos, sportVideoComments, sportVideoLikes, sportVideoStars } from "@workspace/db";
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
    (role !== "athlete" && role !== "teacher") ||
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
  res.json({ videos: rows.map((row) => ({ ...row, videoUrl: `/api/storage${row.videoPath}` })) });
});

router.get("/profiles/:username", requireAuth, async (req: Request, res: Response) => {
  const username = String(req.params.username).toLowerCase();
  const [profile] = await db.select().from(sportProfiles).where(eq(sportProfiles.username, username)).limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json({ profile: normalizeProfile(profile) });
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
  res.json({ videos: rows.map((row) => ({ ...row, videoUrl: `/api/storage${row.videoPath}` })) });
});

router.get("/people", requireAuth, async (req: Request, res: Response) => {
  const query = typeof req.query.query === "string" ? req.query.query.trim().toLowerCase() : "";
  const sport = typeof req.query.sport === "string" ? req.query.sport.trim().toLowerCase() : "";
  const rows = await db.select({
    userId: sportProfiles.userId,
    name: sportProfiles.name,
    username: sportProfiles.username,
    sport: sportProfiles.sport,
    role: sportProfiles.role,
    city: sportProfiles.city,
    photoPath: sportProfiles.photoPath,
    stars: sql<number>`(select count(*)::int from sport_video_stars stars inner join sport_videos videos on videos.id = stars.video_id where videos.user_id = ${sportProfiles.userId})`,
  }).from(sportProfiles).orderBy(desc(sql`stars`), sportProfiles.name).limit(100);
  const filtered = rows.filter((row) =>
    (!query || `${row.name} ${row.username} ${row.sport} ${row.city ?? ""}`.toLowerCase().includes(query)) &&
    (!sport || row.sport.toLowerCase() === sport),
  );
  res.json({ people: filtered.map((row) => ({ ...row, photoUrl: row.photoPath ? `/api/storage${row.photoPath}` : null })) });
});

export default router;