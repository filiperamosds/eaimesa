import { db, guestSessions } from "@eaimesa/db";
import { eq } from "drizzle-orm";
import type { FastifyReply } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { setGuestCookie } from "./http";
import { signGuestToken } from "./jwt";

export async function issueGuestCookie(
  reply: FastifyReply,
  input: {
    venueId: string;
    tableSessionId: string;
    tabId: string | null;
    sessionId?: string;
  },
) {
  const ttlSec = env.guestSessionTtlHours * 3600;
  const expiresAt = new Date(Date.now() + ttlSec * 1000);

  let sessionId = input.sessionId;
  if (!sessionId) {
    const [created] = await db
      .insert(guestSessions)
      .values({
        venueId: input.venueId,
        tableSessionId: input.tableSessionId,
        tabId: input.tabId,
        expiresAt,
      })
      .returning();
    if (!created) throw new AppError(500, "INTERNAL", "Falha na sessão.");
    sessionId = created.id;
  } else {
    await db
      .update(guestSessions)
      .set({ tabId: input.tabId, expiresAt })
      .where(eq(guestSessions.id, sessionId));
  }

  const jwt = await signGuestToken({
    sub: sessionId,
    venueId: input.venueId,
    tableSessionId: input.tableSessionId,
    tabId: input.tabId,
    role: "guest",
  });
  setGuestCookie(reply, jwt, ttlSec);
  return sessionId;
}
