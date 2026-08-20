import { billingEvents, db, venues } from "@eaimesa/db";
import {
  CHECKOUT_STUB_DELAY_MS,
  checkoutSchema,
  effectivePriceCents,
  ERROR_CODES,
  planAllowsService,
  planRank,
} from "@eaimesa/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireOwner } from "../lib/auth-guard";
import { canCheckoutPlan, loadVenue, paidPeriodEndsAtFrom, serializeVenue, subscriptionAllowsUse } from "../lib/billing";
import { parseBody } from "../lib/http";
import { getPlan, loadPlanCatalog, planKindSync, publicBillingPlans, publicPlanPayload } from "../lib/plan-catalog";

export async function billingRoutes(app: FastifyInstance) {
  app.get("/v1/billing/plans", async () => publicBillingPlans());

  app.get("/v1/billing/me", { preHandler: requireOwner }, async (req) => {
    const catalog = await loadPlanCatalog();
    const venue = await loadVenue(req.owner!.venueId);
    const currentKind = planKindSync(venue.plan);
    const listed = catalog.plans.filter((p) => p.listed);
    return {
      venue: serializeVenue(venue),
      entitlement: subscriptionAllowsUse(venue),
      canUpgrade: listed.some(
        (p) => p.id !== venue.plan && planRank(p.kind) > planRank(currentKind) && canCheckoutPlan(venue, p).ok,
      ),
      canDowngrade: listed.some(
        (p) => p.id !== venue.plan && planRank(p.kind) < planRank(currentKind) && canCheckoutPlan(venue, p).ok,
      ),
      plans: listed.map((p) => ({ ...publicPlanPayload(p), listed: true })),
      trialDays: catalog.trialDays,
      paidPeriodDays: catalog.paidPeriodDays,
    };
  });

  app.post("/v1/billing/checkout", { preHandler: requireOwner }, async (req) => {
    const body = parseBody(checkoutSchema, req.body);
    const venue = await loadVenue(req.owner!.venueId);
    const catalog = await loadPlanCatalog();
    const plan = await getPlan(body.plan);
    if (!plan) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, "Plano inválido.");
    }
    const gate = canCheckoutPlan(venue, plan);
    if (!gate.ok) {
      throw new AppError(409, gate.code, gate.message);
    }
    if (!plan.listed && body.plan !== venue.plan) {
      throw new AppError(400, ERROR_CODES.PLAN_NOT_LISTED, "Este plano não está à venda.");
    }

    const method = body.method ?? "card";
    const now = new Date();
    const periodEnd = paidPeriodEndsAtFrom(now, catalog.paidPeriodDays);
    const amountCents = effectivePriceCents(plan);
    await new Promise((resolve) => setTimeout(resolve, CHECKOUT_STUB_DELAY_MS));
    const [updated] = await db
      .update(venues)
      .set({
        plan: plan.id,
        subscriptionStatus: "active",
        acceptsOrders: planAllowsService(plan.kind),
        currentPeriodEndsAt: periodEnd,
        updatedAt: now,
      })
      .where(eq(venues.id, venue.id))
      .returning();
    if (!updated) throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Estabelecimento não encontrado.");

    await db.insert(billingEvents).values({
      venueId: venue.id,
      plan: plan.id,
      planName: plan.name,
      method,
      amountCents,
      provider: "stub",
      status: "success",
    });

    return {
      status: "success",
      provider: "stub",
      method,
      plan: plan.id,
      planName: plan.name,
      amountCents,
      listPriceCents: plan.priceCents,
      promoPriceCents: plan.promoPriceCents,
      subscriptionStatus: "active",
      currentPeriodEndsAt: periodEnd.toISOString(),
      venue: serializeVenue(updated),
      message: `Pagamento aprovado. Plano ativo por ${catalog.paidPeriodDays} dias.`,
    };
  });
}
