import { db, venues } from "@eaimesa/db";
import {
  addDays,
  ERROR_CODES,
  PAID_PERIOD_DAYS,
  planAllowsService,
  planRank,
  type PlanCatalogItem,
} from "@eaimesa/shared";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors";
import { loadPlanCatalog, planKindSync, planNameSync } from "./plan-catalog";

export type VenueRow = typeof venues.$inferSelect;

export function serializeVenue(v: VenueRow) {
  const planKind = planKindSync(v.plan);
  return {
    id: v.id,
    name: v.name,
    slug: v.slug,
    publicId: v.publicId,
    plan: v.plan,
    planKind,
    planName: planNameSync(v.plan),
    subscriptionStatus: v.subscriptionStatus,
    acceptsOrders: v.acceptsOrders && planAllowsService(planKind) && subscriptionAllowsUse(v).ok,
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
  target: Pick<PlanCatalogItem, "id" | "kind">,
): { ok: true } | { ok: false; code: string; message: string } {
  if (target.id === venue.plan) return { ok: true };
  const fromKind = planKindSync(venue.plan);
  if (planRank(target.kind) >= planRank(fromKind)) return { ok: true };

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

export async function assertServicePlan(venue: VenueRow) {
  await loadPlanCatalog();
  if (!planAllowsService(planKindSync(venue.plan))) {
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
  await assertServicePlan(venue);
}

export function trialEndsAtFrom(now = new Date(), days = 7): Date {
  return addDays(now, days);
}

export function paidPeriodEndsAtFrom(now = new Date(), days = PAID_PERIOD_DAYS): Date {
  return addDays(now, days);
}
