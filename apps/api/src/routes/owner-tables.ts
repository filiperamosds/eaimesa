import { db, venueTables } from "@eaimesa/db";
import {
  createTableSchema,
  ERROR_CODES,
  patchTableSchema,
  PLAN_BAR_MAX_TABLES,
} from "@eaimesa/shared";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireOwner } from "../lib/auth-guard";
import { requireServicePlan } from "../lib/billing";
import { parseBody } from "../lib/http";

function serialize(row: typeof venueTables.$inferSelect) {
  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sortOrder,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function activeCount(venueId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(venueTables)
    .where(and(eq(venueTables.venueId, venueId), eq(venueTables.active, true)));
  return Number(row?.n ?? 0);
}

async function labelTaken(venueId: string, label: string, exceptId?: string) {
  const filters = [
    eq(venueTables.venueId, venueId),
    sql`lower(${venueTables.label}) = ${label.toLowerCase()}`,
  ];
  if (exceptId) filters.push(ne(venueTables.id, exceptId));
  const [row] = await db
    .select({ id: venueTables.id })
    .from(venueTables)
    .where(and(...filters))
    .limit(1);
  return Boolean(row);
}

export async function ownerTableRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOwner);
  app.addHook("preHandler", requireServicePlan);

  app.get("/v1/owner/tables", async (req) => {
    const venueId = req.owner!.venueId;
    const rows = await db
      .select()
      .from(venueTables)
      .where(eq(venueTables.venueId, venueId))
      .orderBy(asc(venueTables.sortOrder), asc(venueTables.createdAt));
    return {
      tables: rows.map(serialize),
      maxActive: PLAN_BAR_MAX_TABLES,
      activeCount: rows.filter((t) => t.active).length,
    };
  });

  app.post("/v1/owner/tables", async (req) => {
    const venueId = req.owner!.venueId;
    const body = parseBody(createTableSchema, req.body);

    if (await labelTaken(venueId, body.label)) {
      throw new AppError(409, ERROR_CODES.TABLE_LABEL_TAKEN, "Já existe uma mesa com esse nome.");
    }
    if ((await activeCount(venueId)) >= PLAN_BAR_MAX_TABLES) {
      throw new AppError(
        409,
        ERROR_CODES.TABLE_LIMIT,
        `Auto atendimento: no máximo ${PLAN_BAR_MAX_TABLES} mesas ativas.`,
      );
    }

    const [maxRow] = await db
      .select({ sortOrder: venueTables.sortOrder })
      .from(venueTables)
      .where(eq(venueTables.venueId, venueId))
      .orderBy(sql`${venueTables.sortOrder} desc`)
      .limit(1);

    const [row] = await db
      .insert(venueTables)
      .values({
        venueId,
        label: body.label,
        sortOrder: body.sortOrder ?? (maxRow ? maxRow.sortOrder + 1 : 0),
        active: true,
      })
      .returning();
    if (!row) throw new AppError(500, "INTERNAL", "Falha ao criar mesa.");
    return serialize(row);
  });

  app.patch("/v1/owner/tables/:id", async (req) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const body = parseBody(patchTableSchema, req.body);

    const [existing] = await db
      .select()
      .from(venueTables)
      .where(and(eq(venueTables.id, id), eq(venueTables.venueId, venueId)))
      .limit(1);
    if (!existing) throw new AppError(404, ERROR_CODES.TABLE_NOT_FOUND, "Mesa não encontrada.");

    if (body.label && (await labelTaken(venueId, body.label, id))) {
      throw new AppError(409, ERROR_CODES.TABLE_LABEL_TAKEN, "Já existe uma mesa com esse nome.");
    }
    if (body.active === true && !existing.active) {
      if ((await activeCount(venueId)) >= PLAN_BAR_MAX_TABLES) {
        throw new AppError(
          409,
          ERROR_CODES.TABLE_LIMIT,
          `Auto atendimento: no máximo ${PLAN_BAR_MAX_TABLES} mesas ativas.`,
        );
      }
    }

    const [row] = await db
      .update(venueTables)
      .set({
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(venueTables.id, id), eq(venueTables.venueId, venueId)))
      .returning();
    if (!row) throw new AppError(404, ERROR_CODES.TABLE_NOT_FOUND, "Mesa não encontrada.");
    return serialize(row);
  });

  app.delete("/v1/owner/tables/:id", async (req, reply) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const deleted = await db
      .delete(venueTables)
      .where(and(eq(venueTables.id, id), eq(venueTables.venueId, venueId)))
      .returning({ id: venueTables.id });
    if (!deleted[0]) throw new AppError(404, ERROR_CODES.TABLE_NOT_FOUND, "Mesa não encontrada.");
    return reply.status(204).send();
  });
}

/** Resolve mesa ativa do venue; snapshot do rótulo. */
export async function resolveOrderTable(
  venueId: string,
  tableId?: string,
  tableLabel?: string,
): Promise<{ tableId: string | null; tableLabel: string }> {
  if (tableId) {
    const [table] = await db
      .select()
      .from(venueTables)
      .where(and(eq(venueTables.id, tableId), eq(venueTables.venueId, venueId)))
      .limit(1);
    if (!table || !table.active) {
      throw new AppError(404, ERROR_CODES.TABLE_NOT_FOUND, "Mesa não encontrada ou inativa.");
    }
    return { tableId: table.id, tableLabel: table.label };
  }
  if (tableLabel) return { tableId: null, tableLabel };
  throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, "Escolha a mesa.");
}
