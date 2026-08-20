import { db, accounts, venueMembers, venues } from "@eaimesa/db";
import { ERROR_CODES, loginSchema, registerSchema } from "@eaimesa/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { clearOwnerCookie, clientIp, OWNER_COOKIE, parseBody, rateLimit, setOwnerCookie } from "../lib/http";
import { signVenueToken, verifyVenueToken } from "../lib/jwt";
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

function defaultRedirect(role: "owner" | "staff") {
  return role === "staff" ? "/garcom" : "/painel/pedidos";
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

    const token = await signVenueToken({
      sub: created.account.id,
      venueId: created.venue.id,
      role: "owner",
    });
    setOwnerCookie(reply, token, env.ownerJwtTtlHours * 3600);
    return {
      role: "owner" as const,
      redirectPath: defaultRedirect("owner"),
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

    const [ownedVenue] = await db
      .select()
      .from(venues)
      .where(eq(venues.ownerAccountId, account.id))
      .limit(1);

    if (ownedVenue) {
      const token = await signVenueToken({
        sub: account.id,
        venueId: ownedVenue.id,
        role: "owner",
      });
      setOwnerCookie(reply, token, env.ownerJwtTtlHours * 3600);
      return {
        role: "owner" as const,
        redirectPath: defaultRedirect("owner"),
        account: { id: account.id, email: account.email },
        venue: serializeVenue(ownedVenue),
      };
    }

    const [membership] = await db
      .select({
        member: venueMembers,
        venue: venues,
      })
      .from(venueMembers)
      .innerJoin(venues, eq(venueMembers.venueId, venues.id))
      .where(and(eq(venueMembers.accountId, account.id), eq(venueMembers.active, true)))
      .limit(1);

    if (!membership) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Conta sem acesso a um estabelecimento.");
    }

    const token = await signVenueToken({
      sub: account.id,
      venueId: membership.venue.id,
      role: "staff",
      memberId: membership.member.id,
    });
    setOwnerCookie(reply, token, env.ownerJwtTtlHours * 3600);
    return {
      role: "staff" as const,
      redirectPath: defaultRedirect("staff"),
      account: { id: account.id, email: account.email },
      member: { id: membership.member.id, name: membership.member.name },
      venue: serializeVenue(membership.venue),
    };
  });

  app.post("/v1/auth/logout", async (_req, reply) => {
    clearOwnerCookie(reply);
    return { ok: true };
  });

  app.get("/v1/auth/me", async (req) => {
    const token = req.cookies[OWNER_COOKIE];
    if (!token) {
      throw new AppError(401, "UNAUTHORIZED", "Faça login para continuar.");
    }
    const session = await verifyVenueToken(token);
    const [account] = await db.select().from(accounts).where(eq(accounts.id, session.sub)).limit(1);
    const [venue] = await db.select().from(venues).where(eq(venues.id, session.venueId)).limit(1);
    if (!account || !venue) {
      throw new AppError(401, "UNAUTHORIZED", "Sessão inválida.");
    }

    if (session.role === "owner") {
      if (venue.ownerAccountId !== account.id) {
        throw new AppError(401, "UNAUTHORIZED", "Sessão inválida.");
      }
      return {
        role: "owner" as const,
        account: { id: account.id, email: account.email },
        venue: serializeVenue(venue),
      };
    }

    const [member] = await db
      .select()
      .from(venueMembers)
      .where(
        and(
          eq(venueMembers.id, session.memberId ?? ""),
          eq(venueMembers.accountId, account.id),
          eq(venueMembers.active, true),
        ),
      )
      .limit(1);
    if (!member) {
      throw new AppError(401, "UNAUTHORIZED", "Sessão inválida.");
    }
    return {
      role: "staff" as const,
      account: { id: account.id, email: account.email },
      member: { id: member.id, name: member.name },
      venue: serializeVenue(venue),
    };
  });
}
