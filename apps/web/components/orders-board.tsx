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
import type { CatalogCategory, StaffOrder, VenueTable } from "../lib/types";

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} h ${mins % 60} min`;
}

const COLUMN_DOT: Record<(typeof KANBAN_COLUMNS)[number], string> = {
  pending: "bg-chili",
  accepted: "bg-amber",
  preparing: "bg-sage",
  delivered: "bg-ink/30",
};

type BoardEndpoints = {
  list: string;
  patch: (id: string) => string;
  create: string;
  catalog: string;
  tables: string;
};

const OWNER_ENDPOINTS: BoardEndpoints = {
  list: "/v1/owner/orders",
  patch: (id) => `/v1/owner/orders/${id}`,
  create: "/v1/owner/orders",
  catalog: "/v1/owner/catalog",
  tables: "/v1/owner/tables",
};

export const STAFF_BOARD_ENDPOINTS: BoardEndpoints = {
  list: "/v1/staff/orders",
  patch: (id) => `/v1/staff/orders/${id}`,
  create: "/v1/staff/orders",
  catalog: "/v1/staff/catalog",
  tables: "/v1/staff/tables",
};

export function OrdersBoard({
  endpoints = OWNER_ENDPOINTS,
  compact = false,
}: {
  endpoints?: BoardEndpoints;
  compact?: boolean;
}) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ orders: StaffOrder[] }>(endpoints.list);
    setOrders(data.orders);
  }, [endpoints.list]);

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
      const updated = await api<StaffOrder>(endpoints.patch(id), {
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
          <p className="eyebrow">Turno</p>
          <h1 className={`mt-2 font-serif ${compact ? "text-2xl" : "text-3xl"}`}>Pedidos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {compact ? "Aceite e avance os pedidos da mesa e do cardápio." : "Kanban do turno. Pedidos do cardápio e de balcão."}
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary !py-2 text-sm">
          Novo pedido
        </button>
      </div>
      {error ? <p className="mb-3 text-sm text-chili">{error}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <section key={col} className="flex w-[min(100%,18rem)] shrink-0 flex-col rounded-2xl bg-paper-2/70">
            <header className="flex items-center justify-between px-3 py-3">
              <h2 className="flex items-center gap-2 font-serif text-lg">
                <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[col]}`} aria-hidden />
                {ORDER_STATUS_LABEL[col]}
              </h2>
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
          endpoints={endpoints}
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
    <li className="surface p-3 shadow-none">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">
            {order.tableLabel}
            {order.guestName ? ` · ${order.guestName}` : ""}
          </span>
          <span className="text-xs text-ink-soft">{timeAgo(order.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-soft">
          {order.source === "guest" ? "Cardápio" : "Balcão"}
        </p>
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
            className="rounded-full bg-sage px-3 py-1.5 text-xs font-medium text-white"
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
  endpoints,
  onClose,
  onCreated,
  onError,
}: {
  endpoints: BoardEndpoints;
  onClose: () => void;
  onCreated: (order: StaffOrder) => void;
  onError: (m: string | null) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const [tableLabel, setTableLabel] = useState("");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ categories: CatalogCategory[] }>(endpoints.catalog)
      .then((d) => setCatalog(d.categories.filter((c) => c.active)))
      .catch(() => onError("Não foi possível carregar o cardápio."));
    api<{ tables: { id: string; label: string; active?: boolean }[] }>(endpoints.tables)
      .then((d) => {
        const active = d.tables.filter((t) => t.active !== false);
        setTables(active.map((t) => ({ id: t.id, label: t.label, sortOrder: 0, active: true })));
        if (active[0]) setTableId(active[0].id);
      })
      .catch(() => undefined);
  }, [onError, endpoints.catalog, endpoints.tables]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const items = Object.entries(qty)
      .filter(([, n]) => n > 0)
      .map(([catalogItemId, n]) => ({ catalogItemId, qty: n }));
    if (items.length === 0) {
      onError("Escolha pelo menos um item.");
      return;
    }
    if (tables.length > 0 && !tableId) {
      onError("Escolha a mesa.");
      return;
    }
    if (tables.length === 0 && !tableLabel.trim()) {
      onError("Informe a mesa ou cadastre o salão.");
      return;
    }
    setPending(true);
    onError(null);
    try {
      const order = await api<StaffOrder>(endpoints.create, {
        method: "POST",
        body: JSON.stringify({
          tableId: tables.length > 0 ? tableId : undefined,
          tableLabel: tables.length > 0 ? undefined : tableLabel,
          note: note || null,
          items,
        }),
      });
      onCreated(order);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao criar pedido.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center">
      <form onSubmit={submit} className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
        <h2 className="font-serif text-2xl">Pedido de balcão</h2>
        {tables.length > 0 ? (
          <fieldset className="mt-4">
            <legend className="mb-2 block text-sm font-medium">Mesa</legend>
            <div className="flex flex-wrap gap-2">
              {tables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTableId(t.id)}
                  className={
                    tableId === t.id
                      ? "rounded-full bg-chili px-3 py-1.5 text-sm font-medium text-white"
                      : "rounded-full border border-line bg-card px-3 py-1.5 text-sm hover:border-ink/30"
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Mesa / origem</span>
            <input
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
              className="field"
              placeholder="Mesa 4"
              required
            />
            <p className="mt-1 text-xs text-ink-soft">
              Cadastre o salão em{" "}
              <a href="/painel/mesas" className="font-medium text-chili">
                Mesas
              </a>{" "}
              para escolher na grade.
            </p>
          </label>
        )}
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Nota</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={280}
            className="field"
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
                        className="field w-16 text-center"
                      />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={pending} className="btn-primary !py-2 text-sm">
            {pending ? "Lançando…" : "Lançar pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
