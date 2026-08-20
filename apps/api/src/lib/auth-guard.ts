import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors";
import { OWNER_COOKIE, STAFF_COOKIE } from "../lib/http";
import { verifyOwnerToken, verifyStaffToken, type OwnerToken, type StaffToken } from "../lib/jwt";

declare module "fastify" {
  interface FastifyRequest {
    owner?: OwnerToken;
    staff?: StaffToken;
    venueActor?: { venueId: string; staffId?: string; ownerId?: string };
  }
}

export async function requireOwner(req: FastifyRequest, _reply: FastifyReply) {
  const token = req.cookies[OWNER_COOKIE];
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Faça login para continuar.");
  }
  try {
    req.owner = await verifyOwnerToken(token);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Sessão expirada. Entre de novo.");
  }
}

export async function requireStaff(req: FastifyRequest, _reply: FastifyReply) {
  const token = req.cookies[STAFF_COOKIE];
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Faça login como garçom.");
  }
  try {
    req.staff = await verifyStaffToken(token);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Sessão expirada. Entre de novo.");
  }
}

/** Dono ou garçom — geração de claim, fila futura. */
export async function requireVenueActor(req: FastifyRequest, _reply: FastifyReply) {
  const staffToken = req.cookies[STAFF_COOKIE];
  if (staffToken) {
    try {
      const staff = await verifyStaffToken(staffToken);
      req.staff = staff;
      req.venueActor = { venueId: staff.venueId, staffId: staff.sub };
      return;
    } catch {
      /* fall through */
    }
  }
  const ownerToken = req.cookies[OWNER_COOKIE];
  if (ownerToken) {
    try {
      const owner = await verifyOwnerToken(ownerToken);
      req.owner = owner;
      req.venueActor = { venueId: owner.venueId, ownerId: owner.sub };
      return;
    } catch {
      /* fall through */
    }
  }
  throw new AppError(401, "UNAUTHORIZED", "Faça login para continuar.");
}
