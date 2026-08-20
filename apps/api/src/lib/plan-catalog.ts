import { db, planCatalog, platformSettings } from "@eaimesa/db";
import {
  CHECKOUT_STUB_DELAY_MS,
  effectivePriceCents,
  isPlanKind,
  PAID_PERIOD_DAYS,
  PLAN_FUTURE,
  PLANS,
  TRIAL_DAYS,
  type PlanCatalogItem,
  type PlanKind,
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
      kind: p.kind,
      priceCents: p.priceCents,
      promoPriceCents: null,
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

function rowKind(r: { id: string; kind?: string | null }): PlanKind {
  if (isPlanKind(r.kind ?? "")) return r.kind as PlanKind;
  return r.id === "auto_atendimento" ? "auto_atendimento" : "cardapio";
}

function mapRow(r: {
  id: string;
  name: string;
  kind?: string | null;
  priceCents: number;
  promoPriceCents?: number | null;
  blurb: string;
  features: unknown;
  listed: boolean;
  sortOrder: number;
}): PlanCatalogItem {
  return {
    id: r.id,
    name: r.name,
    kind: rowKind(r),
    priceCents: r.priceCents,
    promoPriceCents: r.promoPriceCents ?? null,
    blurb: r.blurb,
    features: Array.isArray(r.features) ? r.features : [],
    listed: r.listed,
    sortOrder: r.sortOrder,
  };
}

export function planNameSync(plan: string): string {
  const hit = cache?.plans.find((p) => p.id === plan);
  if (hit) return hit.name;
  return PLANS[plan as keyof typeof PLANS]?.name ?? plan;
}

export function planKindSync(plan: string): PlanKind {
  const hit = cache?.plans.find((p) => p.id === plan);
  if (hit) return hit.kind;
  if (plan === "auto_atendimento") return "auto_atendimento";
  if (isPlanKind(plan)) return plan;
  return "cardapio";
}

export async function loadPlanCatalog(): Promise<CatalogCache> {
  if (cache) return cache;
  const [settings] = await db.select().from(platformSettings).where(eq(platformSettings.id, "default")).limit(1);
  const rows = await db.select().from(planCatalog).orderBy(asc(planCatalog.sortOrder));
  const base = defaults();
  cache = {
    trialDays: settings?.trialDays ?? base.trialDays,
    paidPeriodDays: settings?.paidPeriodDays ?? base.paidPeriodDays,
    plans: rows.length ? rows.map(mapRow) : base.plans,
  };
  return cache;
}

export async function getPlan(id: string): Promise<PlanCatalogItem | null> {
  const catalog = await loadPlanCatalog();
  const plan = catalog.plans.find((p) => p.id === id);
  if (plan) return plan;
  return defaults().plans.find((p) => p.id === id) ?? null;
}

export function publicPlanPayload(plan: PlanCatalogItem) {
  return {
    id: plan.id,
    name: plan.name,
    kind: plan.kind,
    priceCents: plan.priceCents,
    promoPriceCents: plan.promoPriceCents,
    effectivePriceCents: effectivePriceCents(plan),
    blurb: plan.blurb,
    features: plan.features,
  };
}

export async function publicBillingPlans() {
  const catalog = await loadPlanCatalog();
  return {
    trialDays: catalog.trialDays,
    paidPeriodDays: catalog.paidPeriodDays,
    stubDelayMs: CHECKOUT_STUB_DELAY_MS,
    plans: catalog.plans.filter((p) => p.listed).map((p) => ({ ...publicPlanPayload(p), listed: true })),
    future: PLAN_FUTURE,
  };
}
