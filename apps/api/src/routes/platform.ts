import { accounts, billingEvents, db, planCatalog, platformSettings, platformUsers, venues } from "@eaimesa/db";
import {
  CHECKOUT_STUB_DELAY_MS,
  createPlanCatalogSchema,
  effectivePriceCents,
  ERROR_CODES,
  loginSchema,
  patchPlanCatalogSchema,
  patchPlatformSettingsSchema,
  PLAN_CATALOG_MAX,
  PLAN_FUTURE,
  slugifyPlanId,
  type PlanKind,
} from "@eaimesa/shared";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { loadVenue } from "../lib/billing";
import {
  clearPlatformCookie,
  clientIp,
  parseBody,
  PLATFORM_COOKIE,
  rateLimit,
  setPlatformCookie,
} from "../lib/http";
import { signPlatformToken, verifyPlatformToken } from "../lib/jwt";
import { invalidatePlanCatalog, loadPlanCatalog } from "../lib/plan-catalog";
import { verifyPassword } from "../lib/password";

async function requirePlatform(req: FastifyRequest, _reply: FastifyReply) {
  const token = req.cookies[PLATFORM_COOKIE];
  if (!token) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Faça login no console.");
  }
  try {
    req.platform = await verifyPlatformToken(token);
  } catch {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Sessão do console expirada.");
  }
  const [user] = await db.select().from(platformUsers).where(eq(platformUsers.id, req.platform.sub)).limit(1);
  if (!user || !user.active) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Operador inativo.");
  }
}

function serializeCatalogPlan(p: {
  id: string;
  name: string;
  kind?: string | null;
  priceCents: number;
  promoPriceCents?: number | null;
  blurb: string;
  features: string[];
  listed: boolean;
  sortOrder: number;
  updatedAt?: Date;
}) {
  const kind: PlanKind = p.kind === "auto_atendimento" ? "auto_atendimento" : "cardapio";
  return {
    id: p.id,
    name: p.name,
    kind,
    priceCents: p.priceCents,
    promoPriceCents: p.promoPriceCents ?? null,
    effectivePriceCents: effectivePriceCents({
      priceCents: p.priceCents,
      promoPriceCents: p.promoPriceCents ?? null,
    }),
    blurb: p.blurb,
    features: p.features,
    listed: p.listed,
    sortOrder: p.sortOrder,
    updatedAt: p.updatedAt?.toISOString(),
  };
}

export async function platformRoutes(app: FastifyInstance) {
  app.post("/v1/platform/auth/login", async (req, reply) => {
    rateLimit(`plat-login:${clientIp(req)}`, 10, 60_000);
    const body = parseBody(loginSchema, req.body);
    const [user] = await db.select().from(platformUsers).where(eq(platformUsers.email, body.email)).limit(1);
    if (!user || !user.active || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, "E-mail ou senha incorretos.");
    }
    const token = await signPlatformToken({ sub: user.id, role: "platform" });
    setPlatformCookie(reply, token, env.platformJwtTtlHours * 3600);
    return {
      role: "platform" as const,
      redirectPath: "/admin",
      account: { id: user.id, email: user.email, name: user.name },
    };
  });

  app.post("/v1/platform/auth/logout", async (_req, reply) => {
    clearPlatformCookie(reply);
    return { ok: true };
  });

  app.get("/v1/platform/auth/me", { preHandler: requirePlatform }, async (req) => {
    const [user] = await db.select().from(platformUsers).where(eq(platformUsers.id, req.platform!.sub)).limit(1);
    if (!user) throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Operador inativo.");
    return { role: "platform" as const, account: { id: user.id, email: user.email, name: user.name } };
  });

  app.get("/v1/platform/dashboard", { preHandler: requirePlatform }, async () => {
    await loadPlanCatalog();
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const catalog = await loadPlanCatalog();
    const priceByPlan = new Map(catalog.plans.map((p) => [p.id, effectivePriceCents(p)]));
    const nameByPlan = new Map(catalog.plans.map((p) => [p.id, p.name]));

    const allVenues = await db
      .select({
        id: venues.id,
        plan: venues.plan,
        subscriptionStatus: venues.subscriptionStatus,
        trialEndsAt: venues.trialEndsAt,
        currentPeriodEndsAt: venues.currentPeriodEndsAt,
      })
      .from(venues);

    const byStatus: Record<string, number> = { trial: 0, active: 0, suspended: 0, past_due: 0 };
    const byPlanCount: Record<string, number> = {};
    for (const p of catalog.plans) byPlanCount[p.id] = 0;
    let trialExpired = 0;
    let mrrCents = 0;

    for (const v of allVenues) {
      byStatus[v.subscriptionStatus] = (byStatus[v.subscriptionStatus] ?? 0) + 1;
      byPlanCount[v.plan] = (byPlanCount[v.plan] ?? 0) + 1;
      if (v.subscriptionStatus === "trial" && v.trialEndsAt && v.trialEndsAt.getTime() < now.getTime()) {
        trialExpired += 1;
      }
      if (
        v.subscriptionStatus === "active" &&
        (!v.currentPeriodEndsAt || v.currentPeriodEndsAt.getTime() > now.getTime())
      ) {
        mrrCents += priceByPlan.get(v.plan) ?? 0;
      }
    }

    const byPlan = Object.entries(byPlanCount).map(([id, count]) => ({
      id,
      name: nameByPlan.get(id) ?? id,
      count,
    }));

    const recent = await db
      .select({
        id: billingEvents.id,
        venueId: billingEvents.venueId,
        venueName: venues.name,
        venueSlug: venues.slug,
        plan: billingEvents.plan,
        planName: billingEvents.planName,
        method: billingEvents.method,
        amountCents: billingEvents.amountCents,
        provider: billingEvents.provider,
        status: billingEvents.status,
        createdAt: billingEvents.createdAt,
      })
      .from(billingEvents)
      .innerJoin(venues, eq(venues.id, billingEvents.venueId))
      .orderBy(desc(billingEvents.createdAt))
      .limit(10);

    const [sales30] = await db
      .select({
        count: sql<number>`count(*)::int`,
        totalCents: sql<number>`coalesce(sum(${billingEvents.amountCents}), 0)::int`,
      })
      .from(billingEvents)
      .where(and(eq(billingEvents.status, "success"), gte(billingEvents.createdAt, since)));

    return {
      venues: {
        total: allVenues.length,
        byStatus,
        byPlan,
        trialExpired,
      },
      mrrCents,
      checkouts30d: {
        count: Number(sales30?.count ?? 0),
        totalCents: Number(sales30?.totalCents ?? 0),
      },
      recent: recent.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  });

  app.get("/v1/platform/venues", { preHandler: requirePlatform }, async (req) => {
    const q = typeof (req.query as { q?: string }).q === "string" ? (req.query as { q: string }).q.trim() : "";
    const plan = (req.query as { plan?: string }).plan;
    const status = (req.query as { status?: string }).status;

    const filters = [];
    if (q) {
      const like = `%${q}%`;
      filters.push(or(ilike(venues.name, like), ilike(venues.slug, like)));
    }
    if (plan && plan.trim()) filters.push(eq(venues.plan, plan.trim()));
    if (status) filters.push(eq(venues.subscriptionStatus, status));

    const rows = await db
      .select({
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        plan: venues.plan,
        subscriptionStatus: venues.subscriptionStatus,
        acceptsOrders: venues.acceptsOrders,
        trialEndsAt: venues.trialEndsAt,
        currentPeriodEndsAt: venues.currentPeriodEndsAt,
        createdAt: venues.createdAt,
        ownerEmail: accounts.email,
      })
      .from(venues)
      .innerJoin(accounts, eq(accounts.id, venues.ownerAccountId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(venues.createdAt))
      .limit(100);

    const catalog = await loadPlanCatalog();
    const names = new Map(catalog.plans.map((p) => [p.id, p.name]));

    return {
      venues: rows.map((v) => ({
        ...v,
        planName: names.get(v.plan) ?? v.plan,
        trialEndsAt: v.trialEndsAt?.toISOString() ?? null,
        currentPeriodEndsAt: v.currentPeriodEndsAt?.toISOString() ?? null,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  });

  app.post("/v1/platform/venues/:id/suspend", { preHandler: requirePlatform }, async (req) => {
    const { id } = req.params as { id: string };
    const venue = await loadVenue(id);
    const [updated] = await db
      .update(venues)
      .set({ subscriptionStatus: "suspended", updatedAt: new Date() })
      .where(eq(venues.id, venue.id))
      .returning();
    if (!updated) throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Estabelecimento não encontrado.");
    return { ok: true, venueId: updated.id, subscriptionStatus: updated.subscriptionStatus };
  });

  app.post("/v1/platform/venues/:id/unsuspend", { preHandler: requirePlatform }, async (req) => {
    const { id } = req.params as { id: string };
    const venue = await loadVenue(id);
    const now = Date.now();
    let next: "active" | "trial" | "past_due" = "past_due";
    if (venue.currentPeriodEndsAt && venue.currentPeriodEndsAt.getTime() > now) next = "active";
    else if (venue.trialEndsAt && venue.trialEndsAt.getTime() > now) next = "trial";
    const [updated] = await db
      .update(venues)
      .set({ subscriptionStatus: next, updatedAt: new Date() })
      .where(eq(venues.id, venue.id))
      .returning();
    if (!updated) throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Estabelecimento não encontrado.");
    return { ok: true, venueId: updated.id, subscriptionStatus: updated.subscriptionStatus };
  });

  app.get("/v1/platform/plans", { preHandler: requirePlatform }, async () => {
    const catalog = await loadPlanCatalog();
    return {
      trialDays: catalog.trialDays,
      paidPeriodDays: catalog.paidPeriodDays,
      stubDelayMs: CHECKOUT_STUB_DELAY_MS,
      plans: catalog.plans.map((p) => serializeCatalogPlan(p)),
      future: PLAN_FUTURE,
    };
  });

  app.post("/v1/platform/plans", { preHandler: requirePlatform }, async (req) => {
    const body = parseBody(createPlanCatalogSchema, req.body);
    const existing = await db.select({ id: planCatalog.id, sortOrder: planCatalog.sortOrder }).from(planCatalog);
    if (existing.length >= PLAN_CATALOG_MAX) {
      throw new AppError(409, ERROR_CODES.VALIDATION_ERROR, `Máximo de ${PLAN_CATALOG_MAX} planos no catálogo.`);
    }
    const taken = new Set(existing.map((r) => r.id));
    let id = slugifyPlanId(body.name);
    if (taken.has(id)) {
      let n = 2;
      while (taken.has(`${id}-${n}`.slice(0, 48))) n += 1;
      id = `${id}-${n}`.slice(0, 48);
    }
    const nextOrder = existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1;
    const features = (body.features ?? []).filter((f) => f.trim());
    const [created] = await db
      .insert(planCatalog)
      .values({
        id,
        name: body.name,
        kind: body.kind,
        priceCents: body.priceCents,
        promoPriceCents: body.promoPriceCents ?? null,
        blurb: body.blurb,
        features,
        listed: body.listed ?? true,
        sortOrder: nextOrder,
      })
      .returning();
    if (!created) throw new AppError(500, "INTERNAL", "Falha ao criar o plano.");
    invalidatePlanCatalog();
    return serializeCatalogPlan({
      ...created,
      features: Array.isArray(created.features) ? created.features : [],
    });
  });

  app.patch("/v1/platform/plans/:id", { preHandler: requirePlatform }, async (req) => {
    const { id } = req.params as { id: string };
    const [current] = await db.select().from(planCatalog).where(eq(planCatalog.id, id)).limit(1);
    if (!current) throw new AppError(404, "NOT_FOUND", "Plano inexistente.");
    const body = parseBody(patchPlanCatalogSchema, req.body);
    const nextPrice = body.priceCents ?? current.priceCents;
    const nextPromo =
      body.promoPriceCents === undefined ? current.promoPriceCents : body.promoPriceCents;
    if (nextPromo != null && nextPromo >= nextPrice) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, "O preço promocional deve ser menor que o preço cheio.");
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.kind !== undefined) patch.kind = body.kind;
    if (body.priceCents !== undefined) patch.priceCents = body.priceCents;
    if (body.promoPriceCents !== undefined) patch.promoPriceCents = body.promoPriceCents;
    if (body.blurb !== undefined) patch.blurb = body.blurb;
    if (body.features !== undefined) patch.features = body.features;
    if (body.listed !== undefined) patch.listed = body.listed;
    const [updated] = await db.update(planCatalog).set(patch).where(eq(planCatalog.id, id)).returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Plano inexistente.");
    invalidatePlanCatalog();
    return serializeCatalogPlan({
      ...updated,
      features: Array.isArray(updated.features) ? updated.features : [],
    });
  });

  app.patch("/v1/platform/settings", { preHandler: requirePlatform }, async (req) => {
    const body = parseBody(patchPlatformSettingsSchema, req.body);
    const [current] = await db.select().from(platformSettings).where(eq(platformSettings.id, "default")).limit(1);
    const [updated] = await db
      .insert(platformSettings)
      .values({
        id: "default",
        trialDays: body.trialDays ?? current?.trialDays ?? 7,
        paidPeriodDays: body.paidPeriodDays ?? current?.paidPeriodDays ?? 30,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformSettings.id,
        set: {
          trialDays: body.trialDays ?? current?.trialDays ?? 7,
          paidPeriodDays: body.paidPeriodDays ?? current?.paidPeriodDays ?? 30,
          updatedAt: new Date(),
        },
      })
      .returning();
    invalidatePlanCatalog();
    return {
      trialDays: updated?.trialDays ?? 7,
      paidPeriodDays: updated?.paidPeriodDays ?? 30,
    };
  });
}
