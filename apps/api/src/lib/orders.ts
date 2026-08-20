import { orderItems, orders } from "@eaimesa/db";

export function serializeOrder(
  order: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
  extra?: { guestName?: string | null },
) {
  const totalCents = items.reduce((sum, i) => sum + i.unitPriceCentsSnapshot * i.qty, 0);
  return {
    id: order.id,
    status: order.status,
    source: order.source,
    tableId: order.tableId,
    tableLabel: order.tableLabel,
    tabId: order.tabId,
    guestName: extra?.guestName ?? null,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    totalCents,
    items: items.map((i) => ({
      id: i.id,
      catalogItemId: i.catalogItemId,
      name: i.nameSnapshot,
      unitPriceCents: i.unitPriceCentsSnapshot,
      qty: i.qty,
      note: i.note,
    })),
  };
}
