import { db, guestSessions, tableSessions, tabs, venueTables, venues } from "@eaimesa/db";
import { ERROR_CODES, joinTabSchema, openComandaSchema } from "@eaimesa/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { requireGuest } from "../lib/auth-guard";
import { assertServicePlan, requireServicePlan } from "../lib/billing";
import { issueGuestCookie } from "../lib/guest-cookie";
import { clientIp, parseBody, pinJoinLock, rateLimit } from "../lib/http";
import { verifyPassword } from "../lib/password";

export async function guestTabRoutes(app: FastifyInstance) {
  app.post("/v1/guest/tabs/join", async (req, reply) => {
    rateLimit(`join:${clientIp(req)}`, 30, 60_000);
    const body = parseBody(joinTabSchema, req.body);

    const [venue] = await db.select().from(venues).where(eq(venues.slug, body.slug)).limit(1);
    if (!venue) {
      throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Este cardápio não existe.");
    }
    assertServicePlan(venue);

    const lock = pinJoinLock(
      `pinjoin:${clientIp(req)}:${venue.id}`,
      env.pinJoinMaxFailures,
      env.pinJoinWindowMinutes * 60_000,
    );

    const openSessions = await db
      .select({ session: tableSessions, table: venueTables })
      .from(tableSessions)
      .innerJoin(venueTables, eq(tableSessions.tableId, venueTables.id))
      .where(and(eq(tableSessions.venueId, venue.id), eq(tableSessions.status, "open")));

    let matched: (typeof openSessions)[number] | undefined;
    for (const row of openSessions) {
      if (await verifyPassword(body.pin, row.session.pinHash)) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      lock.fail();
      throw new AppError(401, ERROR_CODES.PIN_INVALID, "PIN inválido. Peça o código a quem já está na mesa.");
    }

    lock.succeed();

    await issueGuestCookie(reply, {
      venueId: venue.id,
      tableSessionId: matched.session.id,
      tabId: null,
    });

    return {
      tableLabel: matched.table.label,
      slug: venue.slug,
      needsProfile: true,
      redirectPath: `/${venue.slug}/comanda`,
    };
  });

  app.post("/v1/guest/tabs", { preHandler: [requireGuest, requireServicePlan] }, async (req, reply) => {
    const guest = req.guest!;
    const body = parseBody(openComandaSchema, req.body);

    const [session] = await db
      .select()
      .from(tableSessions)
      .where(eq(tableSessions.id, guest.tableSessionId))
      .limit(1);
    if (!session || session.venueId !== guest.venueId || session.status !== "open") {
      throw new AppError(409, ERROR_CODES.TAB_CLOSED, "Esta mesa foi encerrada. Peça um novo QR ao garçom.");
    }

    const [table] = await db.select().from(venueTables).where(eq(venueTables.id, session.tableId)).limit(1);
    const [venue] = await db.select().from(venues).where(eq(venues.id, session.venueId)).limit(1);
    if (!table || !venue) {
      throw new AppError(404, ERROR_CODES.TABLE_NOT_FOUND, "Mesa não encontrada.");
    }

    const [existing] = await db
      .select()
      .from(tabs)
      .where(
        and(
          eq(tabs.tableSessionId, session.id),
          eq(tabs.guestPhone, body.phone),
          eq(tabs.status, "open"),
        ),
      )
      .limit(1);

    let tab = existing;
    if (!tab) {
      const [created] = await db
        .insert(tabs)
        .values({
          venueId: session.venueId,
          tableId: session.tableId,
          tableSessionId: session.id,
          guestName: body.name,
          guestPhone: body.phone,
          status: "open",
        })
        .returning();
      if (!created) throw new AppError(500, "INTERNAL", "Falha ao abrir comanda.");
      tab = created;
    } else if (tab.guestName !== body.name) {
      const [updated] = await db
        .update(tabs)
        .set({ guestName: body.name, updatedAt: new Date() })
        .where(eq(tabs.id, tab.id))
        .returning();
      if (updated) tab = updated;
    }

    await issueGuestCookie(reply, {
      venueId: session.venueId,
      tableSessionId: session.id,
      tabId: tab.id,
      sessionId: guest.sub,
    });

    return {
      tabId: tab.id,
      guestName: tab.guestName,
      tableLabel: table.label,
      slug: venue.slug,
      needsProfile: false,
      redirectPath: `/${venue.slug}`,
    };
  });

  app.get("/v1/guest/tab", { preHandler: [requireGuest, requireServicePlan] }, async (req) => {
    const guest = req.guest!;
    const [row] = await db
      .select({
        session: tableSessions,
        table: venueTables,
        venue: venues,
        guestSession: guestSessions,
      })
      .from(guestSessions)
      .innerJoin(tableSessions, eq(guestSessions.tableSessionId, tableSessions.id))
      .innerJoin(venueTables, eq(tableSessions.tableId, venueTables.id))
      .innerJoin(venues, eq(tableSessions.venueId, venues.id))
      .where(eq(guestSessions.id, guest.sub))
      .limit(1);

    if (!row) {
      throw new AppError(401, "UNAUTHORIZED", "Sessão expirada. Entre de novo com o PIN.");
    }
    if (row.session.status !== "open") {
      throw new AppError(409, ERROR_CODES.TAB_CLOSED, "Esta mesa foi encerrada.");
    }

    let tab: typeof tabs.$inferSelect | null = null;
    if (row.guestSession.tabId) {
      const [found] = await db.select().from(tabs).where(eq(tabs.id, row.guestSession.tabId)).limit(1);
      tab = found ?? null;
      if (tab && tab.status !== "open") {
        throw new AppError(409, ERROR_CODES.TAB_CLOSED, "Esta comanda foi fechada.");
      }
    }

    return {
      tabId: tab?.id ?? null,
      status: tab?.status ?? "open",
      needsProfile: !tab,
      guestName: tab?.guestName ?? null,
      tableLabel: row.table.label,
      slug: row.venue.slug,
      venueName: row.venue.name,
      expiresAt: row.guestSession.expiresAt.toISOString(),
    };
  });
}
