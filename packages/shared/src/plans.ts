export const PLAN_IDS = ["cardapio", "auto_atendimento"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_FUTURE_ID = "equipamento" as const;

export const TRIAL_DAYS = 7;
export const PAID_PERIOD_DAYS = 30;
/** Tempo do stub no lugar do gateway — o front usa para o estado de loading. */
export const CHECKOUT_STUB_DELAY_MS = 2000;

export const PAYMENT_METHODS = ["card", "pix"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PLANS: Record<
  PlanId,
  { id: PlanId; name: string; priceCents: number; blurb: string; features: string[] }
> = {
  cardapio: {
    id: "cardapio",
    name: "Cardápio",
    priceCents: 4900,
    blurb: "Cardápio público com a sua URL. Sem pedido no celular.",
    features: ["URL pública /seu-bar", "Categorias, itens e foto", "QR do cardápio", "1 estabelecimento"],
  },
  auto_atendimento: {
    id: "auto_atendimento",
    name: "Auto atendimento",
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
  id: PlanId;
  name: string;
  priceCents: number;
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

export function isPlanId(value: string): value is PlanId {
  return value === "cardapio" || value === "auto_atendimento";
}

export function planAllowsService(plan: string): boolean {
  return plan === "auto_atendimento";
}

export function planRank(plan: string): number {
  if (plan === "auto_atendimento") return 2;
  if (plan === "cardapio") return 1;
  return 0;
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
