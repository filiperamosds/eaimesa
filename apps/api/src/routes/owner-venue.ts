import { db, venues } from "@eaimesa/db";
import { ERROR_CODES, patchVenueSchema } from "@eaimesa/shared";
import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireOwner } from "../lib/auth-guard";
import { serializeVenue } from "../lib/billing";
import { parseBody } from "../lib/http";

export async function ownerVenueRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOwner);

  app.get("/v1/owner/venue", async (req) => {
    const [venue] = await db.select().from(venues).where(eq(venues.id, req.owner!.venueId)).limit(1);
    if (!venue) throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Estabelecimento não encontrado.");
    return serializeVenue(venue);
  });

  app.patch("/v1/owner/venue", async (req) => {
    const body = parseBody(patchVenueSchema, req.body);
    if (body.slug) {
      const taken = await db
        .select({ id: venues.id })
        .from(venues)
        .where(and(eq(venues.slug, body.slug), ne(venues.id, req.owner!.venueId)))
        .limit(1);
      if (taken[0]) {
        throw new AppError(409, ERROR_CODES.SLUG_TAKEN, "Este slug já está em uso.");
      }
    }

    const [venue] = await db
      .update(venues)
      .set({
        ...(body.name ? { name: body.name } : {}),
        ...(body.slug ? { slug: body.slug } : {}),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, req.owner!.venueId))
      .returning();

    if (!venue) throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Estabelecimento não encontrado.");
    return serializeVenue(venue);
  });
}
