import { catalogItems, db, guestSessions, orderItems, orders, tableSessions, tabs, venueTables, venues } from "@eaimesa/db";
import { createGuestOrderSchema, ERROR_CODES, idempotencyKeySchema, tabPartialCents } from "@eaimesa/shared";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireGuest } from "../lib/auth-guard";
import { requireServicePlan } from "../lib/billing";
import { clientIp, parseBody, rateLimit } from "../lib/http";
import { serializeOrder } from "../lib/orders";

function readIdempotencyKey(header: string | string[] | undefined) {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) {
    throw new AppError(400, "VALIDATION_ERROR", "Informe o header Idempotency-Key (UUID).");
  }
  const parsed = idempotencyKeySchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Idempotency-Key inválida.");
  }
  return parsed.data;
}

async function loadGuestTabContext(
  guest: { sub: string; venueId: string; tableSessionId: string; tabId: string | null },
  opts: { requireOrdering?: boolean } = {},
) {
  const [row] = await db
    .select({
      guestSession: guestSessions,
      session: tableSessions,
      venue: venues,
      table: venueTables,
    })
    .from(guestSessions)
    .innerJoin(tableSessions, eq(guestSessions.tableSessionId, tableSessions.id))
    .innerJoin(venues, eq(tableSessions.venueId, venues.id))
    .innerJoin(venueTables, eq(tableSessions.tableId, venueTables.id))
    .where(eq(guestSessions.id, guest.sub))
    .limit(1);

  if (!row || row.venue.id !== guest.venueId) {
    throw new AppError(401, "UNAUTHORIZED", "Sessão expirada. Entre de novo com o PIN.");
  }
  if (opts.requireOrdering) {
    if (row.venue.subscriptionStatus === "suspended") {
      throw new AppError(403, ERROR_CODES.VENUE_SUSPENDED, "Este bar está com a assinatura inativa.");
    }
    if (!row.venue.acceptsOrders) {
      throw new AppError(403, ERROR_CODES.VENUE_SUSPENDED, "Este bar não está aceitando pedidos pelo cardápio.");
    }
  }
  if (row.session.status !== "open") {
    throw new AppError(409, ERROR_CODES.TAB_CLOSED, "Esta mesa foi encerrada. Peça um novo QR ao garçom.");
  }
  if (!guest.tabId || !row.guestSession.tabId) {
    throw new AppError(403, ERROR_CODES.TAB_REQUIRED, "Abra sua comanda com nome e telefone.");
  }

  const [tab] = await db.select().from(tabs).where(eq(tabs.id, row.guestSession.tabId)).limit(1);
  if (!tab || tab.venueId !== guest.venueId) {
    throw new AppError(403, ERROR_CODES.TAB_REQUIRED, "Abra sua comanda com nome e telefone.");
  }
  if (tab.status !== "open") {
    throw new AppError(409, ERROR_CODES.TAB_CLOSED, "Esta comanda foi fechada.");
  }

  return { ...row, tab };
}

async function loadOrderBundle(order: typeof orders.$inferSelect, guestName: string | null) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return serializeOrder(order, items, { guestName });
}

export async function guestOrderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireGuest);
  app.addHook("preHandler", requireServicePlan);

  app.get("/v1/guest/orders", async (req) => {
    const ctx = await loadGuestTabContext(req.guest!);
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const rows = await db
      .select()
      .from(orders)
      .where(
        and(eq(orders.tabId, ctx.tab.id), eq(orders.venueId, ctx.venue.id), gt(orders.createdAt, since)),
      )
      .orderBy(desc(orders.createdAt));

    const ids = rows.map((r) => r.id);
    const items =
      ids.length === 0 ? [] : await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));

    const serialized = rows.map((o) =>
      serializeOrder(
        o,
        items.filter((i) => i.orderId === o.id),
        { guestName: ctx.tab.guestName },
      ),
    );
    return { orders: serialized, totalCents: tabPartialCents(serialized) };
  });

  app.get("/v1/guest/orders/:id", async (req) => {
    const ctx = await loadGuestTabContext(req.guest!);
    const { id } = req.params as { id: string };
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tabId, ctx.tab.id), eq(orders.venueId, ctx.venue.id)))
      .limit(1);
    if (!order) throw new AppError(404, ERROR_CODES.ORDER_NOT_FOUND, "Pedido não encontrado.");
    return loadOrderBundle(order, ctx.tab.guestName);
  });

  app.post("/v1/guest/orders", async (req) => {
    rateLimit(`guest-order:${clientIp(req)}`, 20, 60_000);
    const ctx = await loadGuestTabContext(req.guest!, { requireOrdering: true });
    const body = parseBody(createGuestOrderSchema, req.body);
    const idempotencyKey = readIdempotencyKey(req.headers["idempotency-key"]);

    const [existing] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.venueId, ctx.venue.id), eq(orders.idempotencyKey, idempotencyKey)))
      .limit(1);
    if (existing) {
      if (existing.tabId !== ctx.tab.id) {
        throw new AppError(409, "VALIDATION_ERROR", "Esta chave de idempotência já foi usada.");
      }
      return loadOrderBundle(existing, ctx.tab.guestName);
    }

    const catalogIds = [...new Set(body.items.map((i) => i.catalogItemId))];
    const catalog = await db
      .select()
      .from(catalogItems)
      .where(
        and(
          eq(catalogItems.venueId, ctx.venue.id),
          eq(catalogItems.active, true),
          inArray(catalogItems.id, catalogIds),
        ),
      );

    if (catalog.length !== catalogIds.length) {
      throw new AppError(400, ERROR_CODES.ITEM_NOT_FOUND, "Algum item não está disponível neste cardápio.");
    }

    const byId = new Map(catalog.map((c) => [c.id, c]));
    for (const line of body.items) {
      const item = byId.get(line.catalogItemId)!;
      const max = item.maxNoteLength ?? 80;
      if (line.note && line.note.length > max) {
        throw new AppError(400, "VALIDATION_ERROR", `Nota de ${item.name}: máximo ${max} caracteres.`);
      }
    }

    try {
      const created = await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            venueId: ctx.venue.id,
            status: "pending",
            source: "guest",
            tableId: ctx.table.id,
            tableLabel: ctx.table.label,
            tabId: ctx.tab.id,
            idempotencyKey,
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
                venueId: ctx.venue.id,
                catalogItemId: item.id,
                nameSnapshot: item.name,
                unitPriceCentsSnapshot: item.priceCents,
                qty: line.qty,
                note: line.note ?? null,
              };
            }),
          )
          .returning();

        return serializeOrder(order, inserted, { guestName: ctx.tab.guestName });
      });

      return created;
    } catch (err) {
      const [race] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.venueId, ctx.venue.id), eq(orders.idempotencyKey, idempotencyKey)))
        .limit(1);
      if (race) return loadOrderBundle(race, ctx.tab.guestName);
      throw err;
    }
  });
}
