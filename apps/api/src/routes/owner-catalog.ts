import { catalogCategories, catalogItems, db } from "@eaimesa/db";
import {
  createCategorySchema,
  createItemSchema,
  ERROR_CODES,
  patchCategorySchema,
  patchItemSchema,
} from "@eaimesa/shared";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireOwner } from "../lib/auth-guard";
import { parseBody } from "../lib/http";
import { removeUploadedIfOwned, saveItemImage } from "../lib/uploads";

function venueFilter(venueId: string) {
  return eq(catalogCategories.venueId, venueId);
}

export async function ownerCatalogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOwner);

  app.get("/v1/owner/catalog", async (req) => {
    const venueId = req.owner!.venueId;
    const categories = await db
      .select()
      .from(catalogCategories)
      .where(eq(catalogCategories.venueId, venueId))
      .orderBy(asc(catalogCategories.sortOrder), asc(catalogCategories.createdAt));

    const items = await db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.venueId, venueId))
      .orderBy(asc(catalogItems.sortOrder), asc(catalogItems.createdAt));

    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        active: c.active,
        items: items
          .filter((i) => i.categoryId === c.id)
          .map((i) => ({
            id: i.id,
            categoryId: i.categoryId,
            name: i.name,
            description: i.description,
            imageUrl: i.imageUrl,
            priceCents: i.priceCents,
            sortOrder: i.sortOrder,
            active: i.active,
          })),
      })),
    };
  });

  app.post("/v1/owner/catalog/categories", async (req) => {
    const venueId = req.owner!.venueId;
    const body = parseBody(createCategorySchema, req.body);
    const [row] = await db
      .insert(catalogCategories)
      .values({
        venueId,
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
        active: true,
      })
      .returning();
    return row;
  });

  app.patch("/v1/owner/catalog/categories/:id", async (req) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const body = parseBody(patchCategorySchema, req.body);
    const [row] = await db
      .update(catalogCategories)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(catalogCategories.id, id), venueFilter(venueId)))
      .returning();
    if (!row) throw new AppError(404, ERROR_CODES.CATEGORY_NOT_FOUND, "Categoria não encontrada.");
    return row;
  });

  app.delete("/v1/owner/catalog/categories/:id", async (req) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const [cat] = await db
      .select()
      .from(catalogCategories)
      .where(and(eq(catalogCategories.id, id), venueFilter(venueId)))
      .limit(1);
    if (!cat) throw new AppError(404, ERROR_CODES.CATEGORY_NOT_FOUND, "Categoria não encontrada.");

    const [item] = await db
      .select({ id: catalogItems.id })
      .from(catalogItems)
      .where(and(eq(catalogItems.categoryId, id), eq(catalogItems.venueId, venueId)))
      .limit(1);
    if (item) {
      throw new AppError(409, ERROR_CODES.CATEGORY_NOT_EMPTY, "Remova os itens desta categoria antes.");
    }

    await db.delete(catalogCategories).where(and(eq(catalogCategories.id, id), venueFilter(venueId)));
    return { ok: true };
  });

  app.post("/v1/owner/catalog/items", async (req) => {
    const venueId = req.owner!.venueId;
    const body = parseBody(createItemSchema, req.body);
    const [cat] = await db
      .select()
      .from(catalogCategories)
      .where(and(eq(catalogCategories.id, body.categoryId), venueFilter(venueId)))
      .limit(1);
    if (!cat) throw new AppError(404, ERROR_CODES.CATEGORY_NOT_FOUND, "Categoria não encontrada.");

    const [row] = await db
      .insert(catalogItems)
      .values({
        venueId,
        categoryId: body.categoryId,
        name: body.name,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        priceCents: body.priceCents,
        sortOrder: body.sortOrder ?? 0,
        active: body.active ?? true,
      })
      .returning();
    return row;
  });

  app.patch("/v1/owner/catalog/items/:id", async (req) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const body = parseBody(patchItemSchema, req.body);

    const [existing] = await db
      .select()
      .from(catalogItems)
      .where(and(eq(catalogItems.id, id), eq(catalogItems.venueId, venueId)))
      .limit(1);
    if (!existing) throw new AppError(404, ERROR_CODES.ITEM_NOT_FOUND, "Item não encontrado.");

    if (body.categoryId) {
      const [cat] = await db
        .select()
        .from(catalogCategories)
        .where(and(eq(catalogCategories.id, body.categoryId), venueFilter(venueId)))
        .limit(1);
      if (!cat) throw new AppError(404, ERROR_CODES.CATEGORY_NOT_FOUND, "Categoria não encontrada.");
    }

    const [row] = await db
      .update(catalogItems)
      .set({
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(catalogItems.id, id), eq(catalogItems.venueId, venueId)))
      .returning();
    if (!row) throw new AppError(404, ERROR_CODES.ITEM_NOT_FOUND, "Item não encontrado.");
    if (body.imageUrl !== undefined && body.imageUrl !== existing.imageUrl) {
      await removeUploadedIfOwned(existing.imageUrl);
    }
    return row;
  });

  app.delete("/v1/owner/catalog/items/:id", async (req) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const [existing] = await db
      .select()
      .from(catalogItems)
      .where(and(eq(catalogItems.id, id), eq(catalogItems.venueId, venueId)))
      .limit(1);
    if (!existing) throw new AppError(404, ERROR_CODES.ITEM_NOT_FOUND, "Item não encontrado.");
    await removeUploadedIfOwned(existing.imageUrl);
    await db.delete(catalogItems).where(and(eq(catalogItems.id, id), eq(catalogItems.venueId, venueId)));
    return { ok: true };
  });

  app.post("/v1/owner/catalog/items/:id/image", async (req) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const [existing] = await db
      .select()
      .from(catalogItems)
      .where(and(eq(catalogItems.id, id), eq(catalogItems.venueId, venueId)))
      .limit(1);
    if (!existing) throw new AppError(404, ERROR_CODES.ITEM_NOT_FOUND, "Item não encontrado.");

    const file = await req.file();
    if (!file) throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, "Envie o arquivo em `file`.");
    const buffer = await file.toBuffer();
    const imageUrl = await saveItemImage(buffer, file.filename, file.mimetype);
    await removeUploadedIfOwned(existing.imageUrl);

    const [row] = await db
      .update(catalogItems)
      .set({ imageUrl, updatedAt: new Date() })
      .where(and(eq(catalogItems.id, id), eq(catalogItems.venueId, venueId)))
      .returning();
    return row;
  });
}
