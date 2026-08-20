export const ORDER_STATUSES = ["pending", "accepted", "preparing", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const KANBAN_COLUMNS = ["pending", "accepted", "preparing", "delivered"] as const;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Novos",
  accepted: "Aceitos",
  preparing: "Preparando",
  delivered: "Entregues",
  cancelled: "Cancelados",
};

export const ORDER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "accepted",
  accepted: "preparing",
  preparing: "delivered",
};

export const ORDER_NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Aceitar",
  accepted: "Preparar",
  preparing: "Entregar",
};

/** Status na comanda do cliente (não usa os rótulos da cozinha). */
export const GUEST_ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Na fila",
  accepted: "Aceito",
  preparing: "Preparando",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export function tabPartialCents(orders: { status: string; totalCents: number }[]): number {
  return orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.totalCents, 0);
}
