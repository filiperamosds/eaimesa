import { db, venues } from "@eaimesa/db";
import {
  CHECKOUT_STUB_DELAY_MS,
  checkoutSchema,
  ERROR_CODES,
  PAID_PERIOD_DAYS,
  planAllowsService,
  PLANS,
  TRIAL_DAYS,
  type PlanId,
} from "@eaimesa/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors";
import { requireOwner } from "../lib/auth-guard";
import {
  canCheckoutPlan,
  loadVenue,
  paidPeriodEndsAtFrom,
  serializeVenue,
  subscriptionAllowsUse,
} from "../lib/billing";
import { parseBody } from "../lib/http";

export async function billingRoutes(app: FastifyInstance) {
  app.get("/v1/billing/plans", async () => ({
    trialDays: TRIAL_DAYS,
    paidPeriodDays: PAID_PERIOD_DAYS,
    stubDelayMs: CHECKOUT_STUB_DELAY_MS,
    plans: Object.values(PLANS),
    future: {
      id: "equipamento",
      name: "Equipamento na mesa",
      blurb: "Hardware/tablet na mesa. Em breve.",
    },
  }));

  app.get("/v1/billing/me", { preHandler: requireOwner }, async (req) => {
    const venue = await loadVenue(req.owner!.venueId);
    const targetUp: PlanId = "auto_atendimento";
    const targetDown: PlanId = "cardapio";
    return {
      venue: serializeVenue(venue),
      entitlement: subscriptionAllowsUse(venue),
      canUpgrade: venue.plan !== targetUp && canCheckoutPlan(venue, targetUp).ok,
      canDowngrade: venue.plan !== targetDown && canCheckoutPlan(venue, targetDown).ok,
      plans: Object.values(PLANS),
    };
  });

  app.post("/v1/billing/checkout", { preHandler: requireOwner }, async (req) => {
    const body = parseBody(checkoutSchema, req.body);
    const venue = await loadVenue(req.owner!.venueId);
    const gate = canCheckoutPlan(venue, body.plan);
    if (!gate.ok) {
      throw new AppError(409, gate.code, gate.message);
    }

    const now = new Date();
    const periodEnd = paidPeriodEndsAtFrom(now);
    // Stub no lugar do gateway: espera para o front testar o loading. Não processa cartão/PIX.
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

    const catalog = PLANS[body.plan];
    return {
      status: "success",
      provider: "stub",
      method: body.method,
      plan: catalog.id,
      planName: catalog.name,
      amountCents: catalog.priceCents,
      subscriptionStatus: "active",
      currentPeriodEndsAt: periodEnd.toISOString(),
      venue: serializeVenue(updated),
      message: `Pagamento aprovado. Plano ativo por ${PAID_PERIOD_DAYS} dias.`,
    };
  });
}
