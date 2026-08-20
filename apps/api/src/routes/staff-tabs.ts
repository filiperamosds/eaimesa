import {
  db,
  guestSessions,
  orderItems,
  orders,
  tableClaims,
  tableSessions,
  tabs,
  venueTables,
} from "@eaimesa/db";
import { ERROR_CODES, maskPhone } from "@eaimesa/shared";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireVenueActor } from "../lib/auth-guard";

function serializeOrder(order: typeof orders.$inferSelect, items: (typeof orderItems.$inferSelect)[]) {
  const totalCents = items.reduce((sum, i) => sum + i.unitPriceCentsSnapshot * i.qty, 0);
  return {
    id: order.id,
    status: order.status,
    source: order.source,
    tableId: order.tableId,
    tableLabel: order.tableLabel,
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

export async function staffTabRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireVenueActor);

  app.get("/v1/staff/tables/:tableId/tabs", async (req) => {
    const venueId = req.venueActor!.venueId;
    const { tableId } = req.params as { tableId: string };

    const [table] = await db
      .select()
      .from(venueTables)
      .where(and(eq(venueTables.id, tableId), eq(venueTables.venueId, venueId)))
      .limit(1);
    if (!table) {
      throw new AppError(404, ERROR_CODES.TABLE_NOT_FOUND, "Mesa não encontrada.");
    }

    const [session] = await db
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.venueId, venueId),
          eq(tableSessions.tableId, tableId),
          eq(tableSessions.status, "open"),
        ),
      )
      .limit(1);

    if (!session) {
      return {
        table: { id: table.id, label: table.label, sessionOpen: false, openTabCount: 0 },
        tabs: [] as unknown[],
      };
    }

    const tabRows = await db
      .select()
      .from(tabs)
      .where(eq(tabs.tableSessionId, session.id))
      .orderBy(asc(tabs.createdAt));

    const tabIds = tabRows.map((t) => t.id);
    const orderRows =
      tabIds.length === 0
        ? []
        : await db
            .select()
            .from(orders)
            .where(and(eq(orders.venueId, venueId), inArray(orders.tabId, tabIds)))
            .orderBy(desc(orders.createdAt));
    const orderIds = orderRows.map((o) => o.id);
    const items =
      orderIds.length === 0
        ? []
        : await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));

    return {
      table: {
        id: table.id,
        label: table.label,
        sessionOpen: true,
        openTabCount: tabRows.filter((t) => t.status === "open").length,
      },
      tabs: tabRows.map((t) => {
        const tabOrders = orderRows.filter((o) => o.tabId === t.id);
        const serialized = tabOrders.map((o) =>
          serializeOrder(
            o,
            items.filter((i) => i.orderId === o.id),
          ),
        );
        const totalCents = serialized.reduce((s, o) => s + o.totalCents, 0);
        return {
          id: t.id,
          guestName: t.guestName,
          guestPhoneMasked: maskPhone(t.guestPhone),
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          totalCents,
          orders: serialized,
        };
      }),
    };
  });

  app.post("/v1/staff/tabs/:tabId/close", async (req) => {
    const venueId = req.venueActor!.venueId;
    const { tabId } = req.params as { tabId: string };

    const [tab] = await db
      .select()
      .from(tabs)
      .where(and(eq(tabs.id, tabId), eq(tabs.venueId, venueId)))
      .limit(1);
    if (!tab) {
      throw new AppError(404, ERROR_CODES.TAB_NOT_FOUND, "Comanda não encontrada.");
    }
    if (tab.status !== "open") {
      throw new AppError(409, ERROR_CODES.TAB_CLOSED, "Esta comanda já está fechada.");
    }

    const now = new Date();
    await db.update(tabs).set({ status: "closed", closedAt: now, updatedAt: now }).where(eq(tabs.id, tab.id));
    await db.update(guestSessions).set({ expiresAt: now }).where(eq(guestSessions.tabId, tab.id));

    return { ok: true, tabId: tab.id, status: "closed" as const };
  });

  app.post("/v1/staff/tables/:tableId/close", async (req) => {
    const venueId = req.venueActor!.venueId;
    const { tableId } = req.params as { tableId: string };

    const [table] = await db
      .select()
      .from(venueTables)
      .where(and(eq(venueTables.id, tableId), eq(venueTables.venueId, venueId)))
      .limit(1);
    if (!table) {
      throw new AppError(404, ERROR_CODES.TABLE_NOT_FOUND, "Mesa não encontrada.");
    }

    const [session] = await db
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.venueId, venueId),
          eq(tableSessions.tableId, tableId),
          eq(tableSessions.status, "open"),
        ),
      )
      .limit(1);
    if (!session) {
      throw new AppError(409, ERROR_CODES.TAB_CLOSED, "Esta mesa já está encerrada.");
    }

    const openTabs = await db
      .select({ id: tabs.id })
      .from(tabs)
      .where(and(eq(tabs.tableSessionId, session.id), eq(tabs.status, "open")));
    if (openTabs.length > 0) {
      throw new AppError(
        409,
        ERROR_CODES.TABS_STILL_OPEN,
        `Feche as ${openTabs.length} comanda(s) aberta(s) antes de encerrar a mesa.`,
      );
    }

    const now = new Date();
    await db
      .update(tableSessions)
      .set({ status: "closed", closedAt: now, updatedAt: now })
      .where(eq(tableSessions.id, session.id));
    await db.update(guestSessions).set({ expiresAt: now }).where(eq(guestSessions.tableSessionId, session.id));
    await db
      .update(tableClaims)
      .set({ invalidatedAt: now })
      .where(
        and(
          eq(tableClaims.tableId, tableId),
          isNull(tableClaims.redeemedAt),
          isNull(tableClaims.invalidatedAt),
        ),
      );

    return { ok: true, tableId: table.id, status: "closed" as const };
  });
}
