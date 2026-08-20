import type { FastifyReply, FastifyRequest } from "fastify";
import { db, guestSessions } from "@eaimesa/db";
import { eq } from "drizzle-orm";
import { AppError } from "../errors";
import { GUEST_COOKIE, OWNER_COOKIE } from "../lib/http";
import { verifyGuestToken, verifyVenueToken, type GuestToken, type VenueToken } from "../lib/jwt";

declare module "fastify" {
  interface FastifyRequest {
    session?: VenueToken;
    /** @deprecated use session */
    owner?: VenueToken;
    venueActor?: { venueId: string; memberId?: string; ownerId?: string };
    guest?: GuestToken;
  }
}

async function loadSession(req: FastifyRequest): Promise<VenueToken> {
  const token = req.cookies[OWNER_COOKIE];
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Faça login para continuar.");
  }
  try {
    return await verifyVenueToken(token);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Sessão expirada. Entre de novo.");
  }
}

export async function requireOwner(req: FastifyRequest, _reply: FastifyReply) {
  const session = await loadSession(req);
  if (session.role !== "owner") {
    throw new AppError(403, "FORBIDDEN", "Acesso restrito ao dono do estabelecimento.");
  }
  req.session = session;
  req.owner = session;
}

export async function requireStaff(req: FastifyRequest, _reply: FastifyReply) {
  const session = await loadSession(req);
  if (session.role !== "staff") {
    throw new AppError(403, "FORBIDDEN", "Acesso restrito a garçons.");
  }
  req.session = session;
}

/** Dono ou garçom — geração de claim, fila futura. */
export async function requireVenueActor(req: FastifyRequest, _reply: FastifyReply) {
  const session = await loadSession(req);
  req.session = session;
  if (session.role === "owner") {
    req.owner = session;
    req.venueActor = { venueId: session.venueId, ownerId: session.sub };
  } else {
    req.venueActor = {
      venueId: session.venueId,
      memberId: session.memberId,
      ownerId: session.sub,
    };
  }
}

export async function requireGuest(req: FastifyRequest, _reply: FastifyReply) {
  const token = req.cookies[GUEST_COOKIE];
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Entre na comanda com o PIN da mesa.");
  }
  let session: GuestToken;
  try {
    session = await verifyGuestToken(token);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Sessão expirada. Entre de novo com o PIN.");
  }

  const [row] = await db.select().from(guestSessions).where(eq(guestSessions.id, session.sub)).limit(1);
  if (
    !row ||
    row.venueId !== session.venueId ||
    row.tableSessionId !== session.tableSessionId ||
    row.expiresAt.getTime() < Date.now()
  ) {
    throw new AppError(401, "UNAUTHORIZED", "Sessão expirada. Entre de novo com o PIN.");
  }

  req.guest = {
    ...session,
    tabId: row.tabId,
    tableSessionId: row.tableSessionId,
  };
}
