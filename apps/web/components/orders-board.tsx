"use client";

import {
  formatBrlFromCents,
  KANBAN_COLUMNS,
  ORDER_NEXT,
  ORDER_NEXT_LABEL,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from "@eaimesa/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { CatalogCategory, StaffOrder } from "../lib/types";

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} h ${mins % 60} min`;
}

export function OrdersBoard() {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ orders: StaffOrder[] }>("/v1/owner/orders");
    setOrders(data.orders);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof ApiError ? e.message : "Falha ao carregar pedidos."));
    const t = setInterval(() => {
      void load().catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [load]);

  const byStatus = useMemo(() => {
    const map: Record<string, StaffOrder[]> = {};
    for (const col of KANBAN_COLUMNS) map[col] = [];
    for (const o of orders) {
      map[o.status]?.push(o);
    }
    return map;
  }, [orders]);

  async function setStatus(id: string, status: OrderStatus) {
    setError(null);
    try {
      const updated = await api<StaffOrder>(`/v1/owner/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((cur) => {
        if (status === "cancelled") return cur.filter((o) => o.id !== id);
        return cur.map((o) => (o.id === id ? updated : o));
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Pedidos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Kanban do turno. O cliente ainda não pede pelo cardápio público — use pedido de balcão.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-chili px-5 py-2 text-sm font-medium text-white hover:bg-chili-dark"
        >
          Novo pedido
        </button>
      </div>
      {error ? <p className="mb-3 text-sm text-chili">{error}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <section
            key={col}
            className="flex w-[min(100%,18rem)] shrink-0 flex-col rounded-2xl border border-line bg-paper-2/60"
          >
            <header className="flex items-center justify-between px-3 py-3">
              <h2 className="font-serif text-lg">{ORDER_STATUS_LABEL[col]}</h2>
              <span className="rounded-full bg-card px-2 py-0.5 text-xs text-ink-soft">
                {byStatus[col]?.length ?? 0}
              </span>
            </header>
            <ul className="flex min-h-[12rem] flex-1 flex-col gap-2 px-2 pb-3">
              {(byStatus[col] ?? []).map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  open={openId === order.id}
                  onToggle={() => setOpenId((cur) => (cur === order.id ? null : order.id))}
                  onAdvance={() => {
                    const next = ORDER_NEXT[order.status];
                    if (next) void setStatus(order.id, next);
                  }}
                  onCancel={() => void setStatus(order.id, "cancelled")}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
      {creating ? (
        <NewOrderModal
          onClose={() => setCreating(false)}
          onCreated={(order) => {
            setOrders((cur) => [order, ...cur]);
            setCreating(false);
          }}
          onError={setError}
        />
      ) : null}
    </div>
  );
}

function OrderCard({
  order,
  open,
  onToggle,
  onAdvance,
  onCancel,
}: {
  order: StaffOrder;
  open: boolean;
  onToggle: () => void;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const nextLabel = ORDER_NEXT_LABEL[order.status];
  return (
    <li className="rounded-xl border border-line bg-card p-3 shadow-sm">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">{order.tableLabel}</span>
          <span className="text-xs text-ink-soft">{timeAgo(order.createdAt)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
          {order.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
        </p>
        <p className="mt-1 text-sm tabular-nums">{formatBrlFromCents(order.totalCents)}</p>
      </button>
      {open ? (
        <div className="mt-2 border-t border-line pt-2 text-sm">
          <ul className="space-y-1">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span>
                  {i.qty}× {i.name}
                  {i.note ? <span className="text-ink-soft"> — {i.note}</span> : null}
                </span>
                <span className="tabular-nums">
                  {formatBrlFromCents(i.unitPriceCents * i.qty)}
                </span>
              </li>
            ))}
          </ul>
          {order.note ? <p className="mt-2 text-ink-soft">{order.note}</p> : null}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {nextLabel ? (
          <button
            type="button"
            onClick={onAdvance}
            className="rounded-full bg-sage px-3 py-1 text-xs font-medium text-white"
          >
            {nextLabel}
          </button>
        ) : null}
        {order.status !== "delivered" ? (
          <button type="button" onClick={onCancel} className="rounded-full px-3 py-1 text-xs text-chili">
            Cancelar
          </button>
        ) : null}
      </div>
    </li>
  );
}

function NewOrderModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (order: StaffOrder) => void;
  onError: (m: string | null) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [tableLabel, setTableLabel] = useState("Mesa ");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ categories: CatalogCategory[] }>("/v1/owner/catalog")
      .then((d) => setCatalog(d.categories.filter((c) => c.active)))
      .catch(() => onError("Não foi possível carregar o cardápio."));
  }, [onError]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const items = Object.entries(qty)
      .filter(([, n]) => n > 0)
      .map(([catalogItemId, n]) => ({ catalogItemId, qty: n }));
    if (items.length === 0) {
      onError("Escolha pelo menos um item.");
      return;
    }
    setPending(true);
    onError(null);
    try {
      const order = await api<StaffOrder>("/v1/owner/orders", {
        method: "POST",
        body: JSON.stringify({ tableLabel, note: note || null, items }),
      });
      onCreated(order);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao criar pedido.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-card p-5"
      >
        <h2 className="font-serif text-2xl">Pedido de balcão</h2>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium">Mesa / origem</span>
          <input
            value={tableLabel}
            onChange={(e) => setTableLabel(e.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2"
            required
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Nota</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={280}
            className="w-full rounded-xl border border-line px-3 py-2"
          />
        </label>
        <div className="mt-4 space-y-4">
          {catalog.map((cat) => (
            <div key={cat.id}>
              <p className="font-serif text-chili">{cat.name}</p>
              <ul className="mt-1 divide-y divide-line">
                {cat.items
                  .filter((i) => i.active)
                  .map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span>
                        {item.name}
                        <span className="ml-2 text-ink-soft">{formatBrlFromCents(item.priceCents)}</span>
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={qty[item.id] ?? 0}
                        onChange={(e) =>
                          setQty((cur) => ({ ...cur, [item.id]: Number(e.target.value) || 0 }))
                        }
                        className="w-16 rounded-lg border border-line px-2 py-1 text-center"
                      />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-ink-soft">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-chili px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Lançando…" : "Lançar pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
