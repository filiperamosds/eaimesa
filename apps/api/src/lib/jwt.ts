import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

export type OwnerToken = {
  sub: string;
  venueId: string;
  role: "owner";
};

export type StaffToken = {
  sub: string;
  venueId: string;
  role: "staff";
};

export type GuestToken = {
  sub: string;
  venueId: string;
  tabId: string;
  role: "guest";
};

const ownerSecret = new TextEncoder().encode(env.ownerJwtSecret);
const staffSecret = new TextEncoder().encode(env.staffJwtSecret);
const guestSecret = new TextEncoder().encode(env.guestSessionSecret);

export async function signOwnerToken(payload: OwnerToken) {
  return new SignJWT({ venueId: payload.venueId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${env.ownerJwtTtlHours}h`)
    .sign(ownerSecret);
}

export async function verifyOwnerToken(token: string): Promise<OwnerToken> {
  const { payload } = await jwtVerify(token, ownerSecret);
  if (!payload.sub || payload.role !== "owner" || typeof payload.venueId !== "string") {
    throw new Error("token inválido");
  }
  return { sub: payload.sub, venueId: payload.venueId, role: "owner" };
}

export async function signStaffToken(payload: StaffToken) {
  return new SignJWT({ venueId: payload.venueId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${env.staffJwtTtlHours}h`)
    .sign(staffSecret);
}

export async function verifyStaffToken(token: string): Promise<StaffToken> {
  const { payload } = await jwtVerify(token, staffSecret);
  if (!payload.sub || payload.role !== "staff" || typeof payload.venueId !== "string") {
    throw new Error("token inválido");
  }
  return { sub: payload.sub, venueId: payload.venueId, role: "staff" };
}

export async function signGuestToken(payload: GuestToken) {
  return new SignJWT({ venueId: payload.venueId, tabId: payload.tabId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${env.guestSessionTtlHours}h`)
    .sign(guestSecret);
}

export async function verifyGuestToken(token: string): Promise<GuestToken> {
  const { payload } = await jwtVerify(token, guestSecret);
  if (
    !payload.sub ||
    payload.role !== "guest" ||
    typeof payload.venueId !== "string" ||
    typeof payload.tabId !== "string"
  ) {
    throw new Error("token inválido");
  }
  return {
    sub: payload.sub,
    venueId: payload.venueId,
    tabId: payload.tabId,
    role: "guest",
  };
}
