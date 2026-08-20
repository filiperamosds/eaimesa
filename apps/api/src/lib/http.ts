import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError, type ZodSchema } from "zod";
import { AppError } from "../errors";

export const OWNER_COOKIE = "eaimesa_owner";
export const STAFF_COOKIE = "eaimesa_staff";
export const GUEST_COOKIE = "eaimesa_guest";

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

function cookieOpts(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function setOwnerCookie(reply: FastifyReply, token: string, maxAgeSec: number) {
  reply.setCookie(OWNER_COOKIE, token, cookieOpts(maxAgeSec));
}

export function clearOwnerCookie(reply: FastifyReply) {
  reply.clearCookie(OWNER_COOKIE, { path: "/" });
}

export function setStaffCookie(reply: FastifyReply, token: string, maxAgeSec: number) {
  reply.setCookie(STAFF_COOKIE, token, cookieOpts(maxAgeSec));
}

export function clearStaffCookie(reply: FastifyReply) {
  reply.clearCookie(STAFF_COOKIE, { path: "/" });
}

export function setGuestCookie(reply: FastifyReply, token: string, maxAgeSec: number) {
  reply.setCookie(GUEST_COOKIE, token, cookieOpts(maxAgeSec));
}

export function clearGuestCookie(reply: FastifyReply) {
  reply.clearCookie(GUEST_COOKIE, { path: "/" });
}
