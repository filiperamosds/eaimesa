import { db, venues } from "@eaimesa/db";
import {
  addDays,
  ERROR_CODES,
  PAID_PERIOD_DAYS,
  planAllowsService,
  planRank,
  PLANS,
  TRIAL_DAYS,
  type PlanId,
} from "@eaimesa/shared";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors";

export type VenueRow = typeof venues.$inferSelect;

export function serializeVenue(v: VenueRow) {
  return {
    id: v.id,
    name: v.name,
    slug: v.slug,
    publicId: v.publicId,
    plan: v.plan,
    planName: PLANS[v.plan as PlanId]?.name ?? v.plan,
    subscriptionStatus: v.subscriptionStatus,
    acceptsOrders: v.acceptsOrders && planAllowsService(v.plan) && subscriptionAllowsUse(v).ok,
    trialEndsAt: v.trialEndsAt?.toISOString() ?? null,
    currentPeriodEndsAt: v.currentPeriodEndsAt?.toISOString() ?? null,
  };
}

export function subscriptionAllowsUse(venue: VenueRow): { ok: boolean; code?: string; message?: string } {
  const now = Date.now();
  if (venue.subscriptionStatus === "suspended") {
    return {
      ok: false,
      code: ERROR_CODES.VENUE_SUSPENDED,
      message: "Este bar está com a assinatura inativa.",
    };
  }
  if (venue.subscriptionStatus === "trial") {
    if (venue.trialEndsAt && venue.trialEndsAt.getTime() < now) {
      return {
        ok: false,
        code: ERROR_CODES.BILLING_INACTIVE,
        message: "O trial de 7 dias acabou. Ative o plano para continuar.",
      };
    }
    return { ok: true };
  }
  if (venue.subscriptionStatus === "active") {
    if (venue.currentPeriodEndsAt && venue.currentPeriodEndsAt.getTime() < now) {
      return {
        ok: false,
        code: ERROR_CODES.BILLING_INACTIVE,
        message: "A vigência do plano acabou. Renove para continuar.",
      };
    }
    return { ok: true };
  }
  return {
    ok: false,
    code: ERROR_CODES.BILLING_INACTIVE,
    message: "Assinatura pendente. Ative o plano para continuar.",
  };
}

export function canCheckoutPlan(
  venue: VenueRow,
  target: PlanId,
): { ok: true } | { ok: false; code: string; message: string } {
  if (target === venue.plan) return { ok: true };
  if (planRank(target) > planRank(venue.plan)) return { ok: true };

  const now = Date.now();
  const periodEndsAt = venue.currentPeriodEndsAt;
  const paidPeriodOpen =
    venue.subscriptionStatus === "active" &&
    periodEndsAt != null &&
    periodEndsAt.getTime() > now;
  if (paidPeriodOpen && periodEndsAt) {
    return {
      ok: false,
      code: ERROR_CODES.PLAN_DOWNGRADE_LOCKED,
      message: `Downgrade só depois do fim da vigência (${periodEndsAt.toISOString()}).`,
    };
  }
  return { ok: true };
}

export async function loadVenue(venueId: string): Promise<VenueRow> {
  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) throw new AppError(404, ERROR_CODES.VENUE_NOT_FOUND, "Estabelecimento não encontrado.");
  return venue;
}

export function assertServicePlan(venue: VenueRow) {
  if (!planAllowsService(venue.plan)) {
    throw new AppError(
      403,
      ERROR_CODES.PLAN_FEATURE,
      "Este recurso é do plano Auto atendimento.",
    );
  }
  const use = subscriptionAllowsUse(venue);
  if (!use.ok) {
    throw new AppError(403, use.code ?? ERROR_CODES.BILLING_INACTIVE, use.message ?? "Plano inativo.");
  }
}

export async function requireServicePlan(req: FastifyRequest, _reply: FastifyReply) {
  const venueId = req.owner?.venueId ?? req.venueActor?.venueId ?? req.guest?.venueId;
  if (!venueId) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Faça login para continuar.");
  }
  const venue = await loadVenue(venueId);
  assertServicePlan(venue);
}

export function trialEndsAtFrom(now = new Date()): Date {
  return addDays(now, TRIAL_DAYS);
}

export function paidPeriodEndsAtFrom(now = new Date()): Date {
  return addDays(now, PAID_PERIOD_DAYS);
}
