import { db, accounts, venueMembers, venues } from "@eaimesa/db";
import {
  createStaffSchema,
  ERROR_CODES,
  patchStaffSchema,
  PLAN_BAR_MAX_STAFF,
} from "@eaimesa/shared";
import { and, asc, count, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireOwner } from "../lib/auth-guard";
import { parseBody } from "../lib/http";
import { hashPassword } from "../lib/password";

type MemberRow = typeof venueMembers.$inferSelect & { email: string };

function serialize(row: MemberRow) {
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
    .from(venueMembers)
    .where(and(eq(venueMembers.venueId, venueId), eq(venueMembers.active, true)));
  return Number(row?.n ?? 0);
}

async function listMembers(venueId: string) {
  const rows = await db
    .select({
      member: venueMembers,
      email: accounts.email,
    })
    .from(venueMembers)
    .innerJoin(accounts, eq(venueMembers.accountId, accounts.id))
    .where(eq(venueMembers.venueId, venueId))
    .orderBy(asc(venueMembers.name));
  return rows.map((r) => serialize({ ...r.member, email: r.email }));
}

export async function ownerStaffRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOwner);

  app.get("/v1/owner/staff", async (req) => {
    const venueId = req.owner!.venueId;
    const staff = await listMembers(venueId);
    return {
      staff,
      maxActive: PLAN_BAR_MAX_STAFF,
      activeCount: staff.filter((s) => s.active).length,
    };
  });

  app.post("/v1/owner/staff", async (req) => {
    const venueId = req.owner!.venueId;
    const body = parseBody(createStaffSchema, req.body);

    const [emailTaken] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(sql`lower(${accounts.email}) = ${body.email}`)
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
    const created = await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accounts)
        .values({ email: body.email, passwordHash })
        .returning();
      if (!account) throw new AppError(500, "INTERNAL", "Falha ao criar conta.");

      const [member] = await tx
        .insert(venueMembers)
        .values({
          venueId,
          accountId: account.id,
          role: "staff",
          name: body.name,
          active: true,
        })
        .returning();
      if (!member) throw new AppError(500, "INTERNAL", "Falha ao cadastrar garçom.");
      return { member, email: account.email };
    });

    return serialize({ ...created.member, email: created.email });
  });

  app.patch("/v1/owner/staff/:id", async (req) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };
    const body = parseBody(patchStaffSchema, req.body);

    const [existing] = await db
      .select({ member: venueMembers, email: accounts.email })
      .from(venueMembers)
      .innerJoin(accounts, eq(venueMembers.accountId, accounts.id))
      .where(and(eq(venueMembers.id, id), eq(venueMembers.venueId, venueId)))
      .limit(1);
    if (!existing) throw new AppError(404, ERROR_CODES.STAFF_NOT_FOUND, "Garçom não encontrado.");

    if (body.active === true && !existing.member.active) {
      if ((await activeCount(venueId)) >= PLAN_BAR_MAX_STAFF) {
        throw new AppError(
          409,
          ERROR_CODES.STAFF_LIMIT,
          `Plano Bar: no máximo ${PLAN_BAR_MAX_STAFF} garçons ativos.`,
        );
      }
    }

    const passwordHash = body.password ? await hashPassword(body.password) : undefined;
    if (passwordHash) {
      await db
        .update(accounts)
        .set({ passwordHash })
        .where(eq(accounts.id, existing.member.accountId));
    }

    const [row] = await db
      .update(venueMembers)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(venueMembers.id, id), eq(venueMembers.venueId, venueId)))
      .returning();
    if (!row) throw new AppError(404, ERROR_CODES.STAFF_NOT_FOUND, "Garçom não encontrado.");
    return serialize({ ...row, email: existing.email });
  });

  app.delete("/v1/owner/staff/:id", async (req, reply) => {
    const venueId = req.owner!.venueId;
    const { id } = req.params as { id: string };

    const deleted = await db.transaction(async (tx) => {
      const [member] = await tx
        .delete(venueMembers)
        .where(and(eq(venueMembers.id, id), eq(venueMembers.venueId, venueId)))
        .returning({ id: venueMembers.id, accountId: venueMembers.accountId });
      if (!member) return null;

      const [ownedVenue] = await tx
        .select({ id: venues.id })
        .from(venues)
        .where(eq(venues.ownerAccountId, member.accountId))
        .limit(1);
      if (!ownedVenue) {
        await tx.delete(accounts).where(eq(accounts.id, member.accountId));
      }
      return member;
    });

    if (!deleted) throw new AppError(404, ERROR_CODES.STAFF_NOT_FOUND, "Garçom não encontrado.");
    return reply.status(204).send();
  });
}
