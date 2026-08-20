import { db, guestSessions, tableClaims, tabs, venueTables, venues } from "@eaimesa/db";
import { ERROR_CODES } from "@eaimesa/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { clientIp, rateLimit, setGuestCookie } from "../lib/http";
import { generatePin, hashClaimToken } from "../lib/claim";
import { signGuestToken } from "../lib/jwt";
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

    const [openTab] = await db
      .select()
      .from(tabs)
      .where(and(eq(tabs.venueId, venue.id), eq(tabs.tableId, table.id), eq(tabs.status, "open")))
      .limit(1);
    if (openTab) {
      throw new AppError(409, ERROR_CODES.TAB_ALREADY_OPEN, "Comanda já aberta nesta mesa.");
    }

    const pinDisplay = generatePin();
    const pinHash = await hashPassword(pinDisplay);

    const result = await db.transaction(async (tx) => {
      const [tab] = await tx
        .insert(tabs)
        .values({
          venueId: venue.id,
          tableId: table.id,
          status: "open",
          pinHash,
        })
        .returning();
      if (!tab) throw new AppError(500, "INTERNAL", "Falha ao abrir comanda.");

      await tx
        .update(tableClaims)
        .set({ redeemedAt: new Date(), tabId: tab.id })
        .where(eq(tableClaims.id, claim.id));

      const expiresAt = new Date(Date.now() + env.guestSessionTtlHours * 3600 * 1000);
      const [session] = await tx
        .insert(guestSessions)
        .values({
          tabId: tab.id,
          venueId: venue.id,
          expiresAt,
        })
        .returning();
      if (!session) throw new AppError(500, "INTERNAL", "Falha na sessão.");

      return { tab, session, expiresAt };
    });

    const guestJwt = await signGuestToken({
      sub: result.session.id,
      venueId: venue.id,
      tabId: result.tab.id,
      role: "guest",
    });
    setGuestCookie(reply, guestJwt, env.guestSessionTtlHours * 3600);

    return {
      pinDisplay,
      tableLabel: table.label,
      slug: venue.slug,
      redirectPath: `/${venue.slug}/bem-vindo`,
    };
  });
}
