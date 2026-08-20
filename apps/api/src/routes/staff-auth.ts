import { db, staffAccounts, venues } from "@eaimesa/db";
import { ERROR_CODES, loginSchema } from "@eaimesa/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { requireStaff } from "../lib/auth-guard";
import {
  clearStaffCookie,
  clientIp,
  parseBody,
  rateLimit,
  setStaffCookie,
} from "../lib/http";
import { signStaffToken } from "../lib/jwt";
import { verifyPassword } from "../lib/password";

function serializeVenue(v: typeof venues.$inferSelect) {
  return {
    id: v.id,
    name: v.name,
    slug: v.slug,
    publicId: v.publicId,
    subscriptionStatus: v.subscriptionStatus,
    acceptsOrders: v.acceptsOrders,
  };
}

export async function staffAuthRoutes(app: FastifyInstance) {
  app.post("/v1/staff/auth/login", async (req, reply) => {
    rateLimit(`staff-login:${clientIp(req)}`, 10, 60_000);
    const body = parseBody(loginSchema, req.body);

    const [staff] = await db
      .select()
      .from(staffAccounts)
      .where(eq(staffAccounts.email, body.email))
      .limit(1);
    if (!staff || !(await verifyPassword(body.password, staff.passwordHash))) {
      throw new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, "E-mail ou senha incorretos.");
    }
    if (!staff.active) {
      throw new AppError(403, ERROR_CODES.STAFF_INACTIVE, "Conta de garçom desativada.");
    }

    const [venue] = await db.select().from(venues).where(eq(venues.id, staff.venueId)).limit(1);
    if (!venue) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Estabelecimento não encontrado.");
    }

    const token = await signStaffToken({
      sub: staff.id,
      venueId: staff.venueId,
      role: "staff",
    });
    setStaffCookie(reply, token, env.staffJwtTtlHours * 3600);
    return {
      staff: { id: staff.id, name: staff.name, email: staff.email },
      venue: serializeVenue(venue),
    };
  });

  app.post("/v1/staff/auth/logout", async (_req, reply) => {
    clearStaffCookie(reply);
    return { ok: true };
  });

  app.get("/v1/staff/auth/me", { preHandler: [requireStaff] }, async (req) => {
    const session = req.staff!;
    const [staff] = await db
      .select()
      .from(staffAccounts)
      .where(and(eq(staffAccounts.id, session.sub), eq(staffAccounts.venueId, session.venueId)))
      .limit(1);
    const [venue] = await db.select().from(venues).where(eq(venues.id, session.venueId)).limit(1);
    if (!staff || !staff.active || !venue) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Sessão inválida.");
    }
    return {
      staff: { id: staff.id, name: staff.name, email: staff.email },
      venue: serializeVenue(venue),
    };
  });
}
