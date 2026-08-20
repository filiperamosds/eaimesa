export const PLAN_IDS = ["cardapio", "auto_atendimento"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_KINDS = ["cardapio", "auto_atendimento"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const PLAN_FUTURE_ID = "equipamento" as const;
export const PLAN_CATALOG_MAX = 12;
export const PLAN_ID_MIN = 3;
export const PLAN_ID_MAX = 48;
export const PLAN_ID_REGEX = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

export const TRIAL_DAYS = 7;
export const PAID_PERIOD_DAYS = 30;
/** Tempo do stub no lugar do gateway — o front usa para o estado de loading. */
export const CHECKOUT_STUB_DELAY_MS = 2000;

export const PAYMENT_METHODS = ["card", "pix"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PLANS: Record<
  PlanId,
  { id: PlanId; name: string; kind: PlanKind; priceCents: number; blurb: string; features: string[] }
> = {
  cardapio: {
    id: "cardapio",
    name: "Cardápio",
    kind: "cardapio",
    priceCents: 4900,
    blurb: "Cardápio público com a sua URL. Sem pedido no celular.",
    features: ["URL pública /seu-bar", "Categorias, itens e foto", "QR do cardápio", "1 estabelecimento"],
  },
  auto_atendimento: {
    id: "auto_atendimento",
    name: "Auto atendimento",
    kind: "auto_atendimento",
    priceCents: 14900,
    blurb: "O cliente pede no celular. O garçom opera a fila.",
    features: [
      "Tudo do Cardápio",
      "Mesas e equipe (até 15 mesas, 5 garçons)",
      "QR do garçom + PIN",
      "Pedido, parcial e Kanban",
    ],
  },
};

export type PlanCatalogItem = {
  id: string;
  name: string;
  kind: PlanKind;
  priceCents: number;
  promoPriceCents: number | null;
  blurb: string;
  features: string[];
  listed: boolean;
  sortOrder: number;
};

export const PLAN_FUTURE = {
  id: PLAN_FUTURE_ID,
  name: "Equipamento na mesa",
  blurb: "Hardware/tablet na mesa. Fora desta fatia — em breve.",
};

export const PLAN_KIND_LABEL: Record<PlanKind, string> = {
  cardapio: "Cardápio",
  auto_atendimento: "Auto atendimento",
};

export function isPlanId(value: string): value is PlanId {
  return value === "cardapio" || value === "auto_atendimento";
}

export function isPlanKind(value: string): value is PlanKind {
  return value === "cardapio" || value === "auto_atendimento";
}

/** Feature gate: pedido/garçom. Aceita `kind` ou o id seed `auto_atendimento`. */
export function planAllowsService(planOrKind: string): boolean {
  return resolvePlanKind(planOrKind) === "auto_atendimento";
}

export function resolvePlanKind(planOrKind: string): PlanKind {
  if (isPlanKind(planOrKind)) return planOrKind;
  return "cardapio";
}

export function planRank(planOrKind: string): number {
  if (resolvePlanKind(planOrKind) === "auto_atendimento") return 2;
  if (resolvePlanKind(planOrKind) === "cardapio") return 1;
  return 0;
}

export function hasPromoPrice(plan: { priceCents: number; promoPriceCents?: number | null }): boolean {
  return (
    plan.promoPriceCents != null && plan.promoPriceCents >= 0 && plan.promoPriceCents < plan.priceCents
  );
}

export function effectivePriceCents(plan: { priceCents: number; promoPriceCents?: number | null }): number {
  return hasPromoPrice(plan) ? (plan.promoPriceCents as number) : plan.priceCents;
}

export function slugifyPlanId(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PLAN_ID_MAX);
  if (s.length >= PLAN_ID_MIN) return s;
  const padded = `${s || "plano"}-plan`.slice(0, PLAN_ID_MAX);
  return padded.length >= PLAN_ID_MIN ? padded : "plano-novo";
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
