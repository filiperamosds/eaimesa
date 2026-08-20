import { billingEvents, db, venues } from "@eaimesa/db";
import { CHECKOUT_STUB_DELAY_MS, checkoutSchema, ERROR_CODES, planAllowsService, type PlanId } from "@eaimesa/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireOwner } from "../lib/auth-guard";
import { canCheckoutPlan, loadVenue, paidPeriodEndsAtFrom, serializeVenue, subscriptionAllowsUse } from "../lib/billing";
import { parseBody } from "../lib/http";
import { getPlan, loadPlanCatalog, publicBillingPlans } from "../lib/plan-catalog";

export async function billingRoutes(app: FastifyInstance) {
  app.get("/v1/billing/plans", async () => publicBillingPlans());

  app.get("/v1/billing/me", { preHandler: requireOwner }, async (req) => {
    await loadPlanCatalog();
    const venue = await loadVenue(req.owner!.venueId);
    const catalog = await loadPlanCatalog();
    const targetUp: PlanId = "auto_atendimento";
    const targetDown: PlanId = "cardapio";
    return {
      venue: serializeVenue(venue),
      entitlement: subscriptionAllowsUse(venue),
      canUpgrade: venue.plan !== targetUp && canCheckoutPlan(venue, targetUp).ok,
      canDowngrade: venue.plan !== targetDown && canCheckoutPlan(venue, targetDown).ok,
      plans: catalog.plans.filter((p) => p.listed),
      trialDays: catalog.trialDays,
      paidPeriodDays: catalog.paidPeriodDays,
    };
  });

  app.post("/v1/billing/checkout", { preHandler: requireOwner }, async (req) => {
    const body = parseBody(checkoutSchema, req.body);
    const venue = await loadVenue(req.owner!.venueId);
    const gate = canCheckoutPlan(venue, body.plan);
    if (!gate.ok) {
      throw new AppError(409, gate.code, gate.message);
    }

    const catalog = await loadPlanCatalog();
    const plan = await getPlan(body.plan);
    if (!plan.listed && body.plan !== venue.plan) {
      throw new AppError(400, ERROR_CODES.PLAN_NOT_LISTED, "Este plano não está à venda.");
    }

    const now = new Date();
    const periodEnd = paidPeriodEndsAtFrom(now, catalog.paidPeriodDays);
    await new Promise((resolve) => setTimeout(resolve, CHECKOUT_STUB_DELAY_MS));
    const [updated] = await db
      .update(venues)
      .set({
        plan: body.plan,
        subscriptionStatus: "active",
        acceptsOrders: planAllowsService(body.plan),
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
      method: body.method,
      amountCents: plan.priceCents,
      provider: "stub",
      status: "success",
    });

    return {
      status: "success",
      provider: "stub",
      method: body.method,
      plan: plan.id,
      planName: plan.name,
      amountCents: plan.priceCents,
      subscriptionStatus: "active",
      currentPeriodEndsAt: periodEnd.toISOString(),
      venue: serializeVenue(updated),
      message: `Pagamento aprovado. Plano ativo por ${catalog.paidPeriodDays} dias.`,
    };
  });
}
