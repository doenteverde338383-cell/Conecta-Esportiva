import { and, desc, eq, lt, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import {
  db,
  sportProfiles,
  sportVideos,
  sportVideoComments,
  sportVideoLikes,
  sportVideoStars,
} from "@workspace/db";
import { getUserId, requireAuth } from "../middlewares/auth";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const storage = new ObjectStorageService();

const videoShape = {
  id: sportVideos.id,
  description: sportVideos.description,
  sport: sportVideos.sport,
  tags: sportVideos.tags,
  videoPath: sportVideos.videoPath,
  contentType: sportVideos.contentType,
  originalName: sportVideos.originalName,
  createdAt: sportVideos.createdAt,
  authorId: sportProfiles.userId,
  authorName: sportProfiles.name,
  authorUsername: sportProfiles.username,
  authorRole: sportProfiles.role,
  authorPhotoPath: sportProfiles.photoPath,
  likes: sql<number>`(select count(*)::int from sport_video_likes where video_id = ${sportVideos.id})`,
  stars: sql<number>`(select count(*)::int from sport_video_stars where video_id = ${sportVideos.id})`,
  comments: sql<number>`(select count(*)::int from sport_video_comments where video_id = ${sportVideos.id})`,
};

function serializeVideo(row: Record<string, unknown>) {
  const videoPath = String(row.videoPath);
  const authorPhotoPath = row.authorPhotoPath ? String(row.authorPhotoPath) : null;
  return {
    ...row,
    videoUrl: `/api/storage${videoPath}`,
    authorPhotoUrl: authorPhotoPath ? `/api/storage${authorPhotoPath}` : null,
  };
}

router.get("/videos", requireAuth, async (req: Request, res: Response) => {
  const requestedLimit = Number(req.query.limit ?? 12);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(30, Math.floor(requestedLimit))) : 12;
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const createdBefore = cursor ? new Date(cursor) : undefined;
  const where = createdBefore && !Number.isNaN(createdBefore.valueOf()) ? lt(sportVideos.createdAt, createdBefore) : undefined;
  const rows = await db.select(videoShape)
    .from(sportVideos)
    .innerJoin(sportProfiles, eq(sportProfiles.userId, sportVideos.userId))
    .where(where)
    .orderBy(desc(sportVideos.createdAt))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const userId = getUserId(req);
  const videos = await Promise.all(page.map(async (row) => {
    const [like, star] = await Promise.all([
      db.select({ videoId: sportVideoLikes.videoId }).from(sportVideoLikes).where(and(eq(sportVideoLikes.videoId, row.id), eq(sportVideoLikes.userId, userId))).limit(1),
      db.select({ videoId: sportVideoStars.videoId }).from(sportVideoStars).where(and(eq(sportVideoStars.videoId, row.id), eq(sportVideoStars.userId, userId))).limit(1),
    ]);
    return serializeVideo({ ...row, liked: like.length > 0, starred: star.length > 0 });
  }));
  const nextCursor = hasMore && page.length ? page[page.length - 1].createdAt.toISOString() : null;
  res.json({ videos, nextCursor });
});

router.post("/videos", requireAuth, async (req: Request, res: Response) => {
  const { description, sport, tags, videoPath, contentType, originalName } = req.body ?? {};
  if (
    typeof description !== "string" || description.trim().length < 3 ||
    typeof sport !== "string" || !sport.trim() ||
    !Array.isArray(tags) || tags.some((tag) => typeof tag !== "string") ||
    typeof videoPath !== "string" || !videoPath.startsWith("/objects/") ||
    typeof contentType !== "string" || !contentType.startsWith("video/") ||
    typeof originalName !== "string" || !originalName.trim()
  ) {
    res.status(400).json({ error: "Description, sport and an uploaded video are required" });
    return;
  }
  try {
    await storage.getFile(videoPath);
    const userId = getUserId(req);
    await storage.setMetadata(videoPath, { contentType, ownerId: userId, originalName: originalName.trim() });
    const [video] = await db.insert(sportVideos).values({
      id: randomUUID(),
      userId,
      description: description.trim(),
      sport: sport.trim(),
      tags: tags.slice(0, 10).map((tag: string) => tag.trim()).filter(Boolean),
      videoPath,
      contentType,
      originalName: originalName.trim(),
    }).returning();
    res.status(201).json({ video: serializeVideo({ ...video, liked: false, starred: false, likes: 0, stars: 0, comments: 0, authorId: userId }) });
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(400).json({ error: "Uploaded video was not found" });
      return;
    }
    req.log.error({ err: error }, "Could not create video");
    res.status(500).json({ error: "Could not publish video" });
  }
});

router.get("/videos/:id", requireAuth, async (req: Request, res: Response) => {
  const [row] = await db.select(videoShape)
    .from(sportVideos)
    .innerJoin(sportProfiles, eq(sportProfiles.userId, sportVideos.userId))
    .where(eq(sportVideos.id, String(req.params.id)))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  const userId = getUserId(req);
  const [like, star] = await Promise.all([
    db.select({ videoId: sportVideoLikes.videoId }).from(sportVideoLikes).where(and(eq(sportVideoLikes.videoId, row.id), eq(sportVideoLikes.userId, userId))).limit(1),
    db.select({ videoId: sportVideoStars.videoId }).from(sportVideoStars).where(and(eq(sportVideoStars.videoId, row.id), eq(sportVideoStars.userId, userId))).limit(1),
  ]);
  res.json({ video: serializeVideo({ ...row, liked: like.length > 0, starred: star.length > 0 }) });
});

router.post("/videos/:id/like", requireAuth, async (req: Request, res: Response) => {
  await toggleReaction(sportVideoLikes, req, res);
});

router.post("/videos/:id/star", requireAuth, async (req: Request, res: Response) => {
  await toggleReaction(sportVideoStars, req, res);
});

async function toggleReaction(table: typeof sportVideoLikes | typeof sportVideoStars, req: Request, res: Response) {
  const videoId = String(req.params.id);
  const userId = getUserId(req);
  const [existing] = await db.select().from(table).where(and(eq(table.videoId, videoId), eq(table.userId, userId))).limit(1);
  if (existing) {
    await db.delete(table).where(and(eq(table.videoId, videoId), eq(table.userId, userId)));
  } else {
    await db.insert(table).values({ videoId, userId });
  }
  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(table).where(eq(table.videoId, videoId));
  res.json({ active: !existing, count: countRow?.count ?? 0 });
}

router.get("/videos/:id/comments", requireAuth, async (req: Request, res: Response) => {
  const comments = await db.select({
    id: sportVideoComments.id,
    body: sportVideoComments.body,
    createdAt: sportVideoComments.createdAt,
    userId: sportProfiles.userId,
    name: sportProfiles.name,
    username: sportProfiles.username,
  }).from(sportVideoComments)
    .innerJoin(sportProfiles, eq(sportProfiles.userId, sportVideoComments.userId))
    .where(eq(sportVideoComments.videoId, String(req.params.id)))
    .orderBy(sportVideoComments.createdAt);
  res.json({ comments });
});

router.post("/videos/:id/comments", requireAuth, async (req: Request, res: Response) => {
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body || body.length > 500) {
    res.status(400).json({ error: "Comment must have between 1 and 500 characters" });
    return;
  }
  const [comment] = await db.insert(sportVideoComments).values({
    id: randomUUID(),
    videoId: String(req.params.id),
    userId: getUserId(req),
    body,
  }).returning();
  res.status(201).json({ comment });
});

export default router;