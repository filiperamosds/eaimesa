import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors";
import { OWNER_COOKIE } from "../lib/http";
import { verifyOwnerToken, type OwnerToken } from "../lib/jwt";

declare module "fastify" {
  interface FastifyRequest {
    owner?: OwnerToken;
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
