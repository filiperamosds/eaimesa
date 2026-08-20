import { db, tableClaims, tableSessions, tabs, venueTables, venues } from "@eaimesa/db";
import { ERROR_CODES } from "@eaimesa/shared";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { requireVenueActor } from "../lib/auth-guard";
import { generateClaimToken, hashClaimToken } from "../lib/claim";

export async function staffClaimRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireVenueActor);

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

    const counts = await db
      .select({
        tableId: tabs.tableId,
        n: sql<number>`count(*)::int`,
      })
      .from(tabs)
      .innerJoin(tableSessions, eq(tabs.tableSessionId, tableSessions.id))
      .where(
        and(eq(tabs.venueId, venueId), eq(tabs.status, "open"), eq(tableSessions.status, "open")),
      )
      .groupBy(tabs.tableId);
    const countByTable = new Map(counts.map((c) => [c.tableId, Number(c.n)]));

    return {
      tables: rows.map((t) => ({
        id: t.id,
        label: t.label,
        sortOrder: t.sortOrder,
        sessionOpen: sessionOpen.has(t.id),
        openTabCount: countByTable.get(t.id) ?? 0,
      })),
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
