export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  trial: "Em trial",
  active: "Ativo",
  past_due: "Inadimplente",
  suspended: "Suspenso",
};

export const SUBSCRIPTION_STATUS_HINT: Record<string, string> = {
  trial: "Teste, ainda sem pagamento",
  active: "Assinatura paga em dia",
  past_due: "Trial ou vigência acabou",
  suspended: "Bloqueado pela plataforma",
};

export const SUBSCRIPTION_STATUS_ORDER = ["trial", "active", "past_due", "suspended"] as const;

export const PLAN_ID_LABEL: Record<string, string> = {
  cardapio: "Cardápio",
  auto_atendimento: "Auto atendimento",
};

export const PLAN_ID_ORDER = ["cardapio", "auto_atendimento"] as const;

export function paymentMethodLabel(method: string): string {
  if (method === "pix") return "PIX";
  if (method === "card") return "Cartão";
  return method;
}

export function statusLabel(status: string): string {
  return SUBSCRIPTION_STATUS_LABEL[status] ?? status;
}

export function planLabel(plan: string, planName?: string): string {
  return planName || PLAN_ID_LABEL[plan] || plan;
}
