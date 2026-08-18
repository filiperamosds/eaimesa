import { db, accounts, venues } from "@eaimesa/db";
import { ERROR_CODES, loginSchema, registerSchema } from "@eaimesa/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { requireOwner } from "../lib/auth-guard";
import { clearOwnerCookie, clientIp, parseBody, rateLimit, setOwnerCookie } from "../lib/http";
import { signOwnerToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { newPublicId } from "../lib/public-id";

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

export async function authRoutes(app: FastifyInstance) {
  app.post("/v1/auth/register", async (req, reply) => {
    rateLimit(`reg:${clientIp(req)}`, 10, 60_000);
    const body = parseBody(registerSchema, req.body);

    const existing = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.email, body.email)).limit(1);
    if (existing[0]) {
      throw new AppError(409, ERROR_CODES.EMAIL_TAKEN, "Este e-mail já tem conta.");
    }

    const slugTaken = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, body.slug)).limit(1);
    if (slugTaken[0]) {
      throw new AppError(409, ERROR_CODES.SLUG_TAKEN, "Este slug já está em uso.");
    }

    const passwordHash = await hashPassword(body.password);

    const created = await db.transaction(async (tx) => {
      const [account] = await tx.insert(accounts).values({ email: body.email, passwordHash }).returning();
      if (!account) throw new AppError(500, "INTERNAL", "Falha ao criar conta.");
      const [venue] = await tx
        .insert(venues)
        .values({
          ownerAccountId: account.id,
          name: body.venueName,
          slug: body.slug,
          publicId: newPublicId(),
          subscriptionStatus: "trial",
          acceptsOrders: false,
        })
        .returning();
      if (!venue) throw new AppError(500, "INTERNAL", "Falha ao criar o bar.");
      return { account, venue };
    });

    const token = await signOwnerToken({
      sub: created.account.id,
      venueId: created.venue.id,
      role: "owner",
    });
    setOwnerCookie(reply, token, env.ownerJwtTtlHours * 3600);
    return {
      account: { id: created.account.id, email: created.account.email },
      venue: serializeVenue(created.venue),
    };
  });

  app.post("/v1/auth/login", async (req, reply) => {
    rateLimit(`login:${clientIp(req)}`, 10, 60_000);
    const body = parseBody(loginSchema, req.body);

    const [account] = await db.select().from(accounts).where(eq(accounts.email, body.email)).limit(1);
    if (!account || !(await verifyPassword(body.password, account.passwordHash))) {
      throw new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, "E-mail ou senha incorretos.");
    }

    const [venue] = await db.select().from(venues).where(eq(venues.ownerAccountId, account.id)).limit(1);
    if (!venue) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Conta sem estabelecimento.");
    }

    const token = await signOwnerToken({ sub: account.id, venueId: venue.id, role: "owner" });
    setOwnerCookie(reply, token, env.ownerJwtTtlHours * 3600);
    return {
      account: { id: account.id, email: account.email },
      venue: serializeVenue(venue),
    };
  });

  app.post("/v1/auth/logout", async (_req, reply) => {
    clearOwnerCookie(reply);
    return { ok: true };
  });

  app.get("/v1/auth/me", { preHandler: [requireOwner] }, async (req) => {
    const owner = req.owner!;
    const [account] = await db.select().from(accounts).where(eq(accounts.id, owner.sub)).limit(1);
    const [venue] = await db.select().from(venues).where(eq(venues.id, owner.venueId)).limit(1);
    if (!account || !venue) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Sessão inválida.");
    }
    return {
      account: { id: account.id, email: account.email },
      venue: serializeVenue(venue),
    };
  });
}
