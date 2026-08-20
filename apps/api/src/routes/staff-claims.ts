import { db, tableClaims, tableSessions, tabs, venueTables, venues } from "@eaimesa/db";
import { ERROR_CODES, maskPhone } from "@eaimesa/shared";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { requireVenueActor } from "../lib/auth-guard";
import { requireServicePlan } from "../lib/billing";
import { generateClaimToken, hashClaimToken } from "../lib/claim";

export async function staffClaimRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireVenueActor);
  app.addHook("preHandler", requireServicePlan);

  app.get("/v1/staff/tables", async (req) => {
    const venueId = req.venueActor!.venueId;
    const rows = await db
      .select()
      .from(venueTables)
      .where(and(eq(venueTables.venueId, venueId), eq(venueTables.active, true)))
      .orderBy(asc(venueTables.sortOrder), asc(venueTables.createdAt));

    const openSessions = await db
      .select({ tableId: tableSessions.tableId })
      .from(tableSessions)
      .where(and(eq(tableSessions.venueId, venueId), eq(tableSessions.status, "open")));
    const sessionOpen = new Set(openSessions.map((s) => s.tableId));

    const openTabRows = await db
      .select({
        tableId: tabs.tableId,
        id: tabs.id,
        guestName: tabs.guestName,
        guestPhone: tabs.guestPhone,
      })
      .from(tabs)
      .innerJoin(tableSessions, eq(tabs.tableSessionId, tableSessions.id))
      .where(
        and(eq(tabs.venueId, venueId), eq(tabs.status, "open"), eq(tableSessions.status, "open")),
      )
      .orderBy(asc(tabs.createdAt));

    const tabsByTable = new Map<
      string,
      { id: string; guestName: string; guestPhoneMasked: string }[]
    >();
    for (const row of openTabRows) {
      const list = tabsByTable.get(row.tableId) ?? [];
      list.push({
        id: row.id,
        guestName: row.guestName,
        guestPhoneMasked: maskPhone(row.guestPhone),
      });
      tabsByTable.set(row.tableId, list);
    }

    const pendingClaims = await db
      .select({ tableId: tableClaims.tableId })
      .from(tableClaims)
      .where(
        and(
          eq(tableClaims.venueId, venueId),
          isNull(tableClaims.redeemedAt),
          isNull(tableClaims.invalidatedAt),
          gt(tableClaims.expiresAt, new Date()),
        ),
      );
    const claimPending = new Set(pendingClaims.map((c) => c.tableId));

    return {
      tables: rows.map((t) => {
        const openTabs = tabsByTable.get(t.id) ?? [];
        return {
          id: t.id,
          label: t.label,
          sortOrder: t.sortOrder,
          sessionOpen: sessionOpen.has(t.id),
          claimPending: claimPending.has(t.id),
          openTabCount: openTabs.length,
          openTabs,
        };
      }),
    };
  });

  app.post("/v1/staff/tables/:tableId/claims", async (req) => {
    const venueId = req.venueActor!.venueId;
    const actor = req.venueActor!;
    const { tableId } = req.params as { tableId: string };

    const [table] = await db
      .select()
      .from(venueTables)
      .where(
        and(eq(venueTables.id, tableId), eq(venueTables.venueId, venueId), eq(venueTables.active, true)),
      )
      .limit(1);
    if (!table) {
      throw new AppError(404, ERROR_CODES.TABLE_NOT_FOUND, "Mesa não encontrada ou inativa.");
    }

    const token = generateClaimToken();
    const tokenHash = hashClaimToken(token);
    const expiresAt = new Date(Date.now() + env.claimTtlSeconds * 1000);

    await db
      .update(tableClaims)
      .set({ invalidatedAt: new Date() })
      .where(
        and(
          eq(tableClaims.venueId, venueId),
          eq(tableClaims.tableId, tableId),
          isNull(tableClaims.redeemedAt),
          isNull(tableClaims.invalidatedAt),
        ),
      );

    const [claim] = await db
      .insert(tableClaims)
      .values({
        venueId,
        tableId,
        memberId: actor.memberId ?? null,
        ownerAccountId: actor.memberId ? null : (actor.ownerId ?? null),
        tokenHash,
        expiresAt,
      })
      .returning();

    if (!claim) throw new AppError(500, "INTERNAL", "Falha ao gerar claim.");

    const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
    if (!venue) throw new AppError(500, "INTERNAL", "Venue não encontrado.");

    const claimUrl = `${env.appUrl.replace(/\/$/, "")}/${venue.slug}/c/${token}`;

    return {
      claimId: claim.id,
      tableId: table.id,
      tableLabel: table.label,
      claimUrl,
      expiresAt: claim.expiresAt.toISOString(),
      expiresInSeconds: env.claimTtlSeconds,
    };
  });
}
