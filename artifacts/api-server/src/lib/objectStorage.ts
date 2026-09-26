import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { Storage, type File } from "@google-cloud/storage";

const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
  }
}

export class ObjectStorageService {
  private privateDir() {
    const value = process.env.PRIVATE_OBJECT_DIR;
    if (!value) throw new Error("PRIVATE_OBJECT_DIR is not configured");
    return value.replace(/\/$/, "");
  }

  async requestUploadUrl(contentType: string) {
    const objectId = randomUUID();
    const objectPath = `/objects/uploads/${objectId}`;
    const { bucketName, objectName } = this.parse(`${this.privateDir()}${objectPath.slice("/objects".length)}`);
    const response = await fetch(`${SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_name: bucketName,
        object_name: objectName,
        method: "PUT",
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Object upload URL failed: ${response.status}`);
    const data = (await response.json()) as { signed_url?: string };
    if (!data.signed_url) throw new Error("Object upload URL was empty");
    return { uploadURL: data.signed_url, objectPath, contentType };
  }

  async getFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const { bucketName, objectName } = this.parse(`${this.privateDir()}${objectPath.slice("/objects".length)}`);
    const file = storage.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  async setMetadata(objectPath: string, metadata: { contentType: string; ownerId: string; originalName: string }) {
    const file = await this.getFile(objectPath);
    await file.setMetadata({
      contentType: metadata.contentType,
      metadata: {
        ownerId: metadata.ownerId,
        originalName: metadata.originalName,
      },
    });
  }

  async readMetadata(file: File) {
    const [metadata] = await file.getMetadata();
    return metadata;
  }

  async stream(file: File, range?: { start: number; end?: number }) {
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size ?? 0);
    const contentType = String(metadata.contentType ?? "application/octet-stream");
    const stream = file.createReadStream(range ? { start: range.start, end: range.end } : undefined);
    return { stream, size, contentType };
  }

  private parse(value: string) {
    const normalized = value.startsWith("/") ? value : `/${value}`;
    const [, bucketName, ...parts] = normalized.split("/");
    if (!bucketName || parts.length === 0) throw new Error("Invalid object storage path");
    return { bucketName, objectName: parts.join("/") };
  }
}

export function streamToResponse(stream: NodeJS.ReadableStream, response: { end: (chunk?: unknown) => void; write: (chunk: unknown) => boolean }) {
  Readable.from(stream).on("data", (chunk) => response.write(chunk)).on("end", () => response.end());
}