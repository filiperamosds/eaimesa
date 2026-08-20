import { db, tableClaims, tabs, venueTables, venues } from "@eaimesa/db";
import { ERROR_CODES } from "@eaimesa/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
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
    return {
      tables: rows.map((t) => ({
        id: t.id,
        label: t.label,
        sortOrder: t.sortOrder,
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

    const [openTab] = await db
      .select({ id: tabs.id })
      .from(tabs)
      .where(and(eq(tabs.venueId, venueId), eq(tabs.tableId, tableId), eq(tabs.status, "open")))
      .limit(1);
    if (openTab) {
      throw new AppError(
        409,
        ERROR_CODES.TAB_ALREADY_OPEN,
        "Esta mesa já tem comanda aberta. Feche a conta antes de gerar outro QR.",
      );
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
