import { desc, eq, sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { db, sportProfiles, sportVideoStars } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/rankings", requireAuth, async (_req: Request, res: Response) => {
  const rows = await db.select({
    userId: sportProfiles.userId,
    name: sportProfiles.name,
    username: sportProfiles.username,
    role: sportProfiles.role,
    sport: sportProfiles.sport,
    photoPath: sportProfiles.photoPath,
    stars: sql<number>`count(${sportVideoStars.videoId})::int`,
  }).from(sportProfiles)
    .leftJoin(sportVideoStars, eq(sportVideoStars.userId, sportProfiles.userId))
    .groupBy(sportProfiles.userId)
    .orderBy(desc(sql`count(${sportVideoStars.videoId})`), sportProfiles.name)
    .limit(100);
  res.json({ rankings: rows.map((row, index) => ({ ...row, position: index + 1, photoUrl: row.photoPath ? `/api/storage${row.photoPath}` : null })) });
});

export default router;