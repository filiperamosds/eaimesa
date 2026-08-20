import { db, planCatalog, platformSettings } from "@eaimesa/db";
import {
  CHECKOUT_STUB_DELAY_MS,
  isPlanId,
  PAID_PERIOD_DAYS,
  PLAN_FUTURE,
  PLANS,
  TRIAL_DAYS,
  type PlanCatalogItem,
  type PlanId,
} from "@eaimesa/shared";
import { asc, eq } from "drizzle-orm";

export type CatalogCache = {
  plans: PlanCatalogItem[];
  trialDays: number;
  paidPeriodDays: number;
};

function defaults(): CatalogCache {
  return {
    trialDays: TRIAL_DAYS,
    paidPeriodDays: PAID_PERIOD_DAYS,
    plans: Object.values(PLANS).map((p, i) => ({
      id: p.id,
      name: p.name,
      priceCents: p.priceCents,
      blurb: p.blurb,
      features: p.features,
      listed: true,
      sortOrder: i,
    })),
  };
}

let cache: CatalogCache | null = null;

export function invalidatePlanCatalog() {
  cache = null;
}

export function planNameSync(plan: string): string {
  const hit = cache?.plans.find((p) => p.id === plan);
  if (hit) return hit.name;
  return PLANS[plan as PlanId]?.name ?? plan;
}

export async function loadPlanCatalog(): Promise<CatalogCache> {
  if (cache) return cache;
  const [settings] = await db.select().from(platformSettings).where(eq(platformSettings.id, "default")).limit(1);
  const rows = await db.select().from(planCatalog).orderBy(asc(planCatalog.sortOrder));
  const base = defaults();
  cache = {
    trialDays: settings?.trialDays ?? base.trialDays,
    paidPeriodDays: settings?.paidPeriodDays ?? base.paidPeriodDays,
    plans: rows.length
      ? rows
          .filter((r) => isPlanId(r.id))
          .map((r) => ({
            id: r.id as PlanId,
            name: r.name,
            priceCents: r.priceCents,
            blurb: r.blurb,
            features: Array.isArray(r.features) ? r.features : [],
            listed: r.listed,
            sortOrder: r.sortOrder,
          }))
      : base.plans,
  };
  return cache;
}

export async function getPlan(id: PlanId): Promise<PlanCatalogItem> {
  const catalog = await loadPlanCatalog();
  const plan = catalog.plans.find((p) => p.id === id);
  if (!plan) {
    const fallback = defaults().plans.find((p) => p.id === id);
    if (!fallback) throw new Error(`plano ${id} ausente`);
    return fallback;
  }
  return plan;
}

export async function publicBillingPlans() {
  const catalog = await loadPlanCatalog();
  return {
    trialDays: catalog.trialDays,
    paidPeriodDays: catalog.paidPeriodDays,
    stubDelayMs: CHECKOUT_STUB_DELAY_MS,
    plans: catalog.plans.filter((p) => p.listed).map(({ listed: _l, sortOrder: _s, ...p }) => p),
    future: PLAN_FUTURE,
  };
}
