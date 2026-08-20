import { db, guestSessions, tabs, venueTables, venues } from "@eaimesa/db";
import { ERROR_CODES, joinTabSchema } from "@eaimesa/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { requireGuest } from "../lib/auth-guard";
import { clientIp, parseBody, pinJoinLock, rateLimit, setGuestCookie } from "../lib/http";
import { signGuestToken } from "../lib/jwt";
import { verifyPassword } from "../lib/password";

export async function guestTabRoutes(app: FastifyInstance) {
  app.post("/v1/guest/tabs/join", async (req, reply) => {
    rateLimit(`join:${clientIp(req)}`, 30, 60_000);
    const body = parseBody(joinTabSchema, req.body);

    const [venue] = await db.select().from(venues).where(eq(venues.slug, body.slug)).limit(1);
    if (!venue) {
      throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Este cardápio não existe.");
    }

    const lock = pinJoinLock(
      `pinjoin:${clientIp(req)}:${venue.id}`,
      env.pinJoinMaxFailures,
      env.pinJoinWindowMinutes * 60_000,
    );

    const openTabs = await db
      .select({ tab: tabs, table: venueTables })
      .from(tabs)
      .innerJoin(venueTables, eq(tabs.tableId, venueTables.id))
      .where(and(eq(tabs.venueId, venue.id), eq(tabs.status, "open")));

    let matched: (typeof openTabs)[number] | undefined;
    for (const row of openTabs) {
      if (await verifyPassword(body.pin, row.tab.pinHash)) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      lock.fail();
      throw new AppError(401, ERROR_CODES.PIN_INVALID, "PIN inválido. Peça o código a quem já está na mesa.");
    }

    lock.succeed();

    const expiresAt = new Date(Date.now() + env.guestSessionTtlHours * 3600 * 1000);
    const [session] = await db
      .insert(guestSessions)
      .values({
        tabId: matched.tab.id,
        venueId: venue.id,
        expiresAt,
      })
      .returning();
    if (!session) throw new AppError(500, "INTERNAL", "Falha na sessão.");

    const guestJwt = await signGuestToken({
      sub: session.id,
      venueId: venue.id,
      tabId: matched.tab.id,
      role: "guest",
    });
    setGuestCookie(reply, guestJwt, env.guestSessionTtlHours * 3600);

    return {
      tableLabel: matched.table.label,
      slug: venue.slug,
      redirectPath: `/${venue.slug}`,
    };
  });

  app.get("/v1/guest/tab", { preHandler: requireGuest }, async (req) => {
    const guest = req.guest!;
    const [row] = await db
      .select({
        tab: tabs,
        table: venueTables,
        venue: venues,
        session: guestSessions,
      })
      .from(guestSessions)
      .innerJoin(tabs, eq(guestSessions.tabId, tabs.id))
      .innerJoin(venueTables, eq(tabs.tableId, venueTables.id))
      .innerJoin(venues, eq(tabs.venueId, venues.id))
      .where(eq(guestSessions.id, guest.sub))
      .limit(1);

    if (!row) {
      throw new AppError(401, "UNAUTHORIZED", "Sessão expirada. Entre de novo com o PIN.");
    }
    if (row.tab.status !== "open") {
      throw new AppError(409, ERROR_CODES.TAB_CLOSED, "Esta comanda foi fechada.");
    }

    return {
      tabId: row.tab.id,
      status: row.tab.status,
      tableLabel: row.table.label,
      slug: row.venue.slug,
      venueName: row.venue.name,
      expiresAt: row.session.expiresAt.toISOString(),
    };
  });
}
