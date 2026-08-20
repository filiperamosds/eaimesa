import { db, tableClaims, tableSessions, venueTables, venues } from "@eaimesa/db";
import { ERROR_CODES } from "@eaimesa/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { generatePin, hashClaimToken } from "../lib/claim";
import { issueGuestCookie } from "../lib/guest-cookie";
import { clientIp, rateLimit } from "../lib/http";
import { hashPassword } from "../lib/password";

export async function publicClaimRoutes(app: FastifyInstance) {
  app.post("/v1/public/venues/:slug/c/:token/redeem", async (req, reply) => {
    rateLimit(`redeem:${clientIp(req)}`, 20, 60_000);
    const { slug, token } = req.params as { slug: string; token: string };
    const tokenHash = hashClaimToken(token);

    const [venue] = await db.select().from(venues).where(eq(venues.slug, slug)).limit(1);
    if (!venue) {
      throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Este cardápio não existe.");
    }

    const [claim] = await db
      .select()
      .from(tableClaims)
      .where(and(eq(tableClaims.venueId, venue.id), eq(tableClaims.tokenHash, tokenHash)))
      .limit(1);

    if (!claim) {
      throw new AppError(404, ERROR_CODES.CLAIM_INVALID, "Código inválido ou já usado.");
    }
    if (claim.invalidatedAt) {
      throw new AppError(409, ERROR_CODES.CLAIM_INVALID, "Este código foi substituído. Peça um novo QR ao garçom.");
    }
    if (claim.redeemedAt) {
      throw new AppError(409, ERROR_CODES.CLAIM_ALREADY_USED, "Este código já foi usado. Use o PIN da mesa.");
    }
    if (claim.expiresAt.getTime() < Date.now()) {
      throw new AppError(410, ERROR_CODES.CLAIM_EXPIRED, "Código expirado. Peça um novo QR ao garçom.");
    }

    const [table] = await db
      .select()
      .from(venueTables)
      .where(and(eq(venueTables.id, claim.tableId), eq(venueTables.venueId, venue.id)))
      .limit(1);
    if (!table) {
      throw new AppError(404, ERROR_CODES.TABLE_NOT_FOUND, "Mesa não encontrada.");
    }

    const [existingSession] = await db
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.venueId, venue.id),
          eq(tableSessions.tableId, table.id),
          eq(tableSessions.status, "open"),
        ),
      )
      .limit(1);

    let pinDisplay: string | null = null;
    let sessionRow = existingSession;

    if (!sessionRow) {
      pinDisplay = generatePin();
      const pinHash = await hashPassword(pinDisplay);
      const [created] = await db
        .insert(tableSessions)
        .values({
          venueId: venue.id,
          tableId: table.id,
          pinHash,
          status: "open",
        })
        .returning();
      if (!created) throw new AppError(500, "INTERNAL", "Falha ao abrir a mesa.");
      sessionRow = created;
    }

    await db
      .update(tableClaims)
      .set({
        redeemedAt: new Date(),
        tableSessionId: sessionRow.id,
      })
      .where(eq(tableClaims.id, claim.id));

    await issueGuestCookie(reply, {
      venueId: venue.id,
      tableSessionId: sessionRow.id,
      tabId: null,
    });

    return {
      pinDisplay,
      tableLabel: table.label,
      slug: venue.slug,
      needsProfile: true,
      redirectPath: pinDisplay ? `/${venue.slug}/bem-vindo` : `/${venue.slug}/comanda`,
    };
  });
}
