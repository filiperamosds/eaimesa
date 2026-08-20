import { catalogCategories, catalogItems, db, orderItems, orders, tabs } from "@eaimesa/db";
import { createOrderSchema, ERROR_CODES, KANBAN_COLUMNS } from "@eaimesa/shared";
import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import type { z } from "zod";
import { AppError } from "../errors";
import { serializeOrder } from "./orders";
import { resolveOrderTable } from "../routes/owner-tables";

export async function listKanbanOrders(venueId: string) {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const rows = await db
    .select({ order: orders, guestName: tabs.guestName })
    .from(orders)
    .leftJoin(tabs, eq(orders.tabId, tabs.id))
    .where(
      and(
        eq(orders.venueId, venueId),
        inArray(orders.status, [...KANBAN_COLUMNS]),
        gt(orders.createdAt, since),
      ),
    )
    .orderBy(desc(orders.createdAt));

  const ids = rows.map((r) => r.order.id);
  const items =
    ids.length === 0 ? [] : await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));

  return {
    orders: rows.map((r) =>
      serializeOrder(
        r.order,
        items.filter((i) => i.orderId === r.order.id),
        { guestName: r.guestName },
      ),
    ),
  };
}

export async function patchKanbanOrder(venueId: string, id: string, status: string) {
  const [existing] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.venueId, venueId)))
    .limit(1);
  if (!existing) throw new AppError(404, ERROR_CODES.ORDER_NOT_FOUND, "Pedido não encontrado.");

  const [order] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.venueId, venueId)))
    .returning();

  if (!order) throw new AppError(404, ERROR_CODES.ORDER_NOT_FOUND, "Pedido não encontrado.");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const guestName =
    order.tabId == null
      ? null
      : ((await db.select({ guestName: tabs.guestName }).from(tabs).where(eq(tabs.id, order.tabId)).limit(1))[0]
          ?.guestName ?? null);
  return serializeOrder(order, items, { guestName });
}

export async function createCounterOrder(venueId: string, body: z.infer<typeof createOrderSchema>) {
  const catalogIds = [...new Set(body.items.map((i) => i.catalogItemId))];
  const catalog = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.venueId, venueId), inArray(catalogItems.id, catalogIds)));

  if (catalog.length !== catalogIds.length) {
    throw new AppError(400, ERROR_CODES.ITEM_NOT_FOUND, "Algum item não existe neste cardápio.");
  }

  const byId = new Map(catalog.map((c) => [c.id, c]));
  const table = await resolveOrderTable(venueId, body.tableId, body.tableLabel);

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        venueId,
        status: "pending",
        source: "counter",
        tableId: table.tableId,
        tableLabel: table.tableLabel,
        note: body.note ?? null,
      })
      .returning();
    if (!order) throw new AppError(500, "INTERNAL", "Falha ao criar pedido.");

    const inserted = await tx
      .insert(orderItems)
      .values(
        body.items.map((line) => {
          const item = byId.get(line.catalogItemId)!;
          return {
            orderId: order.id,
            venueId,
            catalogItemId: item.id,
            nameSnapshot: item.name,
            unitPriceCentsSnapshot: item.priceCents,
            qty: line.qty,
            note: line.note ?? null,
          };
        }),
      )
      .returning();

    return serializeOrder(order, inserted);
  });
}

export async function getVenueCatalog(venueId: string) {
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
}
