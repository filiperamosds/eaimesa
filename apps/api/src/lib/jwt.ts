import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

export type OwnerToken = {
  sub: string;
  venueId: string;
  role: "owner";
};

const secret = new TextEncoder().encode(env.ownerJwtSecret);

export async function signOwnerToken(payload: OwnerToken) {
  return new SignJWT({ venueId: payload.venueId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${env.ownerJwtTtlHours}h`)
    .sign(secret);
}

export async function verifyOwnerToken(token: string): Promise<OwnerToken> {
  const { payload } = await jwtVerify(token, secret);
  if (!payload.sub || payload.role !== "owner" || typeof payload.venueId !== "string") {
    throw new Error("token inválido");
  }
  return { sub: payload.sub, venueId: payload.venueId, role: "owner" };
}
