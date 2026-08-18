import { catalogCategories, catalogItems, db, venues } from "@eaimesa/db";
import { ERROR_CODES } from "@eaimesa/shared";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";

export async function publicMenuRoutes(app: FastifyInstance) {
  app.get("/v1/public/venues/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const [venue] = await db.select().from(venues).where(eq(venues.slug, slug)).limit(1);
    if (!venue) {
      throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Este cardápio não existe.");
    }

    const categories = await db
      .select()
      .from(catalogCategories)
      .where(and(eq(catalogCategories.venueId, venue.id), eq(catalogCategories.active, true)))
      .orderBy(asc(catalogCategories.sortOrder), asc(catalogCategories.createdAt));

    const items = await db
      .select()
      .from(catalogItems)
      .where(and(eq(catalogItems.venueId, venue.id), eq(catalogItems.active, true)))
      .orderBy(asc(catalogItems.sortOrder), asc(catalogItems.createdAt));

    return {
      venue: {
        name: venue.name,
        slug: venue.slug,
        subscriptionStatus: venue.subscriptionStatus,
        acceptsOrders: venue.acceptsOrders,
      },
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        items: items
          .filter((i) => i.categoryId === c.id)
          .map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            imageUrl: i.imageUrl,
            priceCents: i.priceCents,
          })),
      })),
    };
  });
}
