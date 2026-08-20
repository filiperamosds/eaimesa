import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

export type VenueRole = "owner" | "staff";

export type VenueToken = {
  sub: string;
  venueId: string;
  role: VenueRole;
  memberId?: string;
};

/** @deprecated use VenueToken */
export type OwnerToken = VenueToken & { role: "owner" };

/** @deprecated use VenueToken */
export type StaffToken = VenueToken & { role: "staff" };

export type GuestToken = {
  sub: string;
  venueId: string;
  tabId: string;
  role: "guest";
};

const venueSecret = new TextEncoder().encode(env.ownerJwtSecret);
const guestSecret = new TextEncoder().encode(env.guestSessionSecret);

export async function signVenueToken(payload: VenueToken) {
  return new SignJWT({
    venueId: payload.venueId,
    role: payload.role,
    ...(payload.memberId ? { memberId: payload.memberId } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${env.ownerJwtTtlHours}h`)
    .sign(venueSecret);
}

export async function verifyVenueToken(token: string): Promise<VenueToken> {
  const { payload } = await jwtVerify(token, venueSecret);
  if (
    !payload.sub ||
    (payload.role !== "owner" && payload.role !== "staff") ||
    typeof payload.venueId !== "string"
  ) {
    throw new Error("token inválido");
  }
  return {
    sub: payload.sub,
    venueId: payload.venueId,
    role: payload.role,
    memberId: typeof payload.memberId === "string" ? payload.memberId : undefined,
  };
}

export async function signOwnerToken(payload: { sub: string; venueId: string; role: "owner" }) {
  return signVenueToken(payload);
}

export async function verifyOwnerToken(token: string): Promise<VenueToken> {
  const session = await verifyVenueToken(token);
  if (session.role !== "owner") throw new Error("token inválido");
  return session;
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
