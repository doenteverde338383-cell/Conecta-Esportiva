import { Router, type Request, type Response } from "express";
import { getUserId, requireAuth } from "../middlewares/auth";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const storage = new ObjectStorageService();

router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body ?? {};
  if (typeof name !== "string" || !name.trim() || !Number.isInteger(size) || size <= 0 || typeof contentType !== "string" || !contentType.trim()) {
    res.status(400).json({ error: "Invalid upload metadata" });
    return;
  }
  const isVideo = contentType.startsWith("video/");
  const isImage = contentType.startsWith("image/");
  if (!isVideo && !isImage) {
    res.status(400).json({ error: "Only video and image files are supported" });
    return;
  }
  const maxSize = isVideo ? 150 * 1024 * 1024 : 10 * 1024 * 1024;
  if (size > maxSize) {
    res.status(400).json({ error: `File exceeds the ${isVideo ? "150MB" : "10MB"} limit` });
    return;
  }
  try {
    const result = await storage.requestUploadUrl(contentType);
    res.json({ ...result, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Could not create upload URL");
    res.status(500).json({ error: "Could not prepare upload" });
  }
});

router.post("/storage/uploads/complete", requireAuth, async (req: Request, res: Response) => {
  const { objectPath, contentType, originalName } = req.body ?? {};
  if (typeof objectPath !== "string" || !objectPath.startsWith("/objects/") || typeof contentType !== "string" || typeof originalName !== "string") {
    res.status(400).json({ error: "Invalid uploaded object" });
    return;
  }
  try {
    await storage.setMetadata(objectPath, { contentType, ownerId: getUserId(req), originalName });
    res.json({ objectPath });
  } catch (error) {
    req.log.error({ err: error }, "Could not finalize upload");
    res.status(400).json({ error: "Uploaded object was not found" });
  }
});

router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const rawPath = req.params.path;
    const objectPath = `/objects/${Array.isArray(rawPath) ? rawPath.join("/") : rawPath}`;
    const file = await storage.getFile(objectPath);
    const metadata = await storage.stream(file);
    const range = parseRange(req.headers.range, metadata.size);
    const { stream, size, contentType } = range ? await storage.stream(file, range) : metadata;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    if (range) {
      res.status(206);
      res.setHeader("Content-Range", `bytes ${range.start}-${range.end ?? size - 1}/${size}`);
      res.setHeader("Content-Length", String((range.end ?? size - 1) - range.start + 1));
    } else {
      res.setHeader("Content-Length", String(size));
    }
    stream.pipe(res);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Could not serve object");
    res.status(500).json({ error: "Could not serve object" });
  }
});

function parseRange(value: string | undefined, size: number | undefined) {
  if (!value || !size) return undefined;
  const match = /^bytes=(\d+)-(\d*)$/.exec(value);
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (start >= size || end < start) return undefined;
  return { start, end };
}

export default router;