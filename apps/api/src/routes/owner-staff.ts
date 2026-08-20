import { db, staffAccounts } from "@eaimesa/db";
import {
  createStaffSchema,
  ERROR_CODES,
  patchStaffSchema,
  PLAN_BAR_MAX_STAFF,
} from "@eaimesa/shared";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireOwner } from "../lib/auth-guard";
import { parseBody } from "../lib/http";
import { hashPassword } from "../lib/password";

function serialize(row: typeof staffAccounts.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function activeCount(venueId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(staffAccounts)
    .where(and(eq(staffAccounts.venueId, venueId), eq(staffAccounts.active, true)));
  return Number(row?.n ?? 0);
}

export async function ownerStaffRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOwner);

  app.get("/v1/owner/staff", async (req) => {
    const venueId = req.owner!.venueId;
    const rows = await db
      .select()
      .from(staffAccounts)
      .where(eq(staffAccounts.venueId, venueId))
      .orderBy(asc(staffAccounts.name));
    return {
      staff: rows.map(serialize),
      maxActive: PLAN_BAR_MAX_STAFF,
      activeCount: rows.filter((s) => s.active).length,
    };
  });

  app.post("/v1/owner/staff", async (req) => {
    const venueId = req.owner!.venueId;
    const body = parseBody(createStaffSchema, req.body);

    const [emailTaken] = await db
      .select({ id: staffAccounts.id })
      .from(staffAccounts)
      .where(sql`lower(${staffAccounts.email}) = ${body.email}`)
      .limit(1);
    if (emailTaken) {
      throw new AppError(409, ERROR_CODES.EMAIL_TAKEN, "Este e-mail já está em uso.");
    }

    if ((await activeCount(venueId)) >= PLAN_BAR_MAX_STAFF) {
      throw new AppError(
        409,
        ERROR_CODES.STAFF_LIMIT,
        `Plano Bar: no máximo ${PLAN_BAR_MAX_STAFF} garçons ativos.`,
      );
    }

    const passwordHash = await hashPassword(body.password);
    const [row] = await db
      .insert(staffAccounts)
      .values({
        venueId,
        name: body.name,
        email: body.email,
        passwordHash,
        active: true,
      })
      .returning();
    if (!row) throw new AppError(500, "INTERNAL", "Falha ao criar garçom.");
    return serialize(row);
  });

  app.patch("/v1/owner/staff/:id", async (req) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const body = parseBody(patchStaffSchema, req.body);

    const [existing] = await db
      .select()
      .from(staffAccounts)
      .where(and(eq(staffAccounts.id, id), eq(staffAccounts.venueId, venueId)))
      .limit(1);
    if (!existing) throw new AppError(404, ERROR_CODES.STAFF_NOT_FOUND, "Garçom não encontrado.");

    if (body.active === true && !existing.active) {
      if ((await activeCount(venueId)) >= PLAN_BAR_MAX_STAFF) {
        throw new AppError(
          409,
          ERROR_CODES.STAFF_LIMIT,
          `Plano Bar: no máximo ${PLAN_BAR_MAX_STAFF} garçons ativos.`,
        );
      }
    }

    const passwordHash = body.password ? await hashPassword(body.password) : undefined;

    const [row] = await db
      .update(staffAccounts)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(staffAccounts.id, id), eq(staffAccounts.venueId, venueId)))
      .returning();
    if (!row) throw new AppError(404, ERROR_CODES.STAFF_NOT_FOUND, "Garçom não encontrado.");
    return serialize(row);
  });

  app.delete("/v1/owner/staff/:id", async (req, reply) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const deleted = await db
      .delete(staffAccounts)
      .where(and(eq(staffAccounts.id, id), eq(staffAccounts.venueId, venueId)))
      .returning({ id: staffAccounts.id });
    if (!deleted[0]) throw new AppError(404, ERROR_CODES.STAFF_NOT_FOUND, "Garçom não encontrado.");
    return reply.status(204).send();
  });
}
