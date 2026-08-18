import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import type { FastifyReply } from "fastify";
import { AppError } from "../errors";

export const UPLOADS_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "../../uploads");

const ALLOWED: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$/i;

export async function saveItemImage(buffer: Buffer, filename: string, mimetype: string) {
  const ext = extname(filename).toLowerCase();
  const mime = ALLOWED[ext];
  if (!mime || (mimetype && mimetype !== "application/octet-stream" && !mimetype.startsWith("image/"))) {
    throw new AppError(400, "VALIDATION_ERROR", "Envie JPG, PNG ou WebP.");
  }
  if (buffer.length > 2 * 1024 * 1024) {
    throw new AppError(400, "VALIDATION_ERROR", "Imagem no máximo 2 MB.");
  }
  await mkdir(UPLOADS_DIR, { recursive: true });
  const stored = `${randomUUID()}${ext === ".jpeg" ? ".jpg" : ext}`;
  await writeFile(join(UPLOADS_DIR, stored), buffer);
  return `/v1/uploads/${stored}`;
}

export async function removeUploadedIfOwned(imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith("/v1/uploads/")) return;
  const file = imageUrl.slice("/v1/uploads/".length);
  if (!FILE_RE.test(file)) return;
  const path = join(UPLOADS_DIR, file);
  if (existsSync(path)) await unlink(path).catch(() => undefined);
}

export function sendUpload(reply: FastifyReply, file: string) {
  if (!FILE_RE.test(file)) {
    throw new AppError(404, "NOT_FOUND", "Arquivo não encontrado.");
  }
  const path = join(UPLOADS_DIR, file);
  if (!existsSync(path)) {
    throw new AppError(404, "NOT_FOUND", "Arquivo não encontrado.");
  }
  const mime = ALLOWED[extname(file).toLowerCase()] ?? "application/octet-stream";
  reply.header("Cache-Control", "public, max-age=86400");
  return reply.type(mime).send(createReadStream(path));
}
