import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError, type ZodSchema } from "zod";
import { AppError } from "../errors";

export const OWNER_COOKIE = "eaimesa_owner";

export function parseBody<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const msg = err.issues[0]?.message ?? "Dados inválidos.";
      throw new AppError(400, "VALIDATION_ERROR", msg);
    }
    throw err;
  }
}

export function clientIp(req: FastifyRequest) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? req.ip;
  return req.ip;
}

const buckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  cur.n += 1;
  if (cur.n > max) {
    throw new AppError(429, "RATE_LIMITED", "Muitas tentativas. Espere um minuto.");
  }
}

export function setOwnerCookie(reply: FastifyReply, token: string, maxAgeSec: number) {
  reply.setCookie(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  });
}

export function clearOwnerCookie(reply: FastifyReply) {
  reply.clearCookie(OWNER_COOKIE, { path: "/" });
}
