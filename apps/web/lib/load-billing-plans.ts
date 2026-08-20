import { PLAN_FUTURE, PLANS, TRIAL_DAYS, PAID_PERIOD_DAYS, CHECKOUT_STUB_DELAY_MS, type PlanKind } from "@eaimesa/shared";
import { apiBase } from "./api";

export type BillingPlan = {
  id: string;
  name: string;
  kind?: PlanKind;
  priceCents: number;
  promoPriceCents?: number | null;
  effectivePriceCents?: number;
  blurb: string;
  features: string[];
  listed?: boolean;
};

export type BillingPlansPayload = {
  trialDays: number;
  paidPeriodDays: number;
  stubDelayMs: number;
  plans: BillingPlan[];
  future: { id: string; name: string; blurb: string };
};

function fallback(): BillingPlansPayload {
  return {
    trialDays: TRIAL_DAYS,
    paidPeriodDays: PAID_PERIOD_DAYS,
    stubDelayMs: CHECKOUT_STUB_DELAY_MS,
    plans: Object.values(PLANS).map((p) => ({ ...p, promoPriceCents: null, listed: true })),
    future: PLAN_FUTURE,
  };
}

export async function loadBillingPlans(): Promise<BillingPlansPayload> {
  try {
    const res = await fetch(`${apiBase()}/v1/billing/plans`, { next: { revalidate: 15 } });
    if (!res.ok) return fallback();
    return (await res.json()) as BillingPlansPayload;
  } catch {
    return fallback();
  }
}
