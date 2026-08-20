"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import {
  PLAN_ID_LABEL,
  SUBSCRIPTION_STATUS_HINT,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_ORDER,
  paymentMethodLabel,
} from "../lib/admin-copy";
import { api, ApiError } from "../lib/api";

type Dash = {
  venues: {
    total: number;
    byStatus: Record<string, number>;
    byPlan: { id: string; name: string; count: number }[];
    trialExpired: number;
  };
  mrrCents: number;
  checkouts30d: { count: number; totalCents: number };
  recent: {
    id: string;
    venueName: string;
    venueSlug: string;
    planName: string;
    method: string;
    amountCents: number;
    createdAt: string;
  }[];
};

const STATUS_BAR: Record<string, string> = {
  trial: "bg-amber",
  active: "bg-sage",
  past_due: "bg-chili/80",
  suspended: "bg-white/35",
};

function Breakdown({
  title,
  total,
  rows,
}: {
  title: string;
  total: number;
  rows: { id: string; label: string; hint?: string; n: number; bar: string }[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-white/40">
          {total} {total === 1 ? "bar" : "bares"}
        </p>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.n / total) * 100) : 0;
          return (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>
                  <span className="text-white/90">{row.label}</span>
                  {row.hint ? <span className="mt-0.5 block text-[11px] text-white/40">{row.hint}</span> : null}
                </span>
                <span className="shrink-0 tabular-nums text-white">
                  {row.n}
                  <span className="ml-1.5 text-xs text-white/40">{pct}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Dash>("/v1/platform/dashboard")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar."));
  }, []);

  if (!data) return <p className="text-white/55">{error ?? "Carregando…"}</p>;

  const cards = [
    ["Bares", String(data.venues.total)],
    ["MRR estimado", formatBrlFromCents(data.mrrCents)],
    ["Checkouts 30d", String(data.checkouts30d.count)],
    ["Faturado 30d", formatBrlFromCents(data.checkouts30d.totalCents)],
  ];

  const statusRows = SUBSCRIPTION_STATUS_ORDER.map((id) => {
    const n = data.venues.byStatus[id] ?? 0;
    const expiredNote =
      id === "trial" && data.venues.trialExpired > 0
        ? `${data.venues.trialExpired} com a data já vencida`
        : undefined;
    return {
      id,
      label: SUBSCRIPTION_STATUS_LABEL[id] ?? id,
      hint: expiredNote ?? SUBSCRIPTION_STATUS_HINT[id],
      n,
      bar: STATUS_BAR[id] ?? "bg-white/40",
    };
  });

  const planRows = data.venues.byPlan.map((row) => ({
    id: row.id,
    label: row.name || PLAN_ID_LABEL[row.id] || row.id,
    n: row.count,
    bar: row.id === "auto_atendimento" ? "bg-chili" : "bg-white/50",
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Vendas</p>
        <h1 className="mt-2 font-serif text-3xl">Dashboard</h1>
        <p className="mt-2 text-sm text-white/55">Assinatura B2B (stub). Não inclui consumo das mesas.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/45">{k}</p>
            <p className="mt-2 font-serif text-2xl">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Breakdown title="Por status da assinatura" total={data.venues.total} rows={statusRows} />
        <Breakdown title="Por plano" total={data.venues.total} rows={planRows} />
      </div>
      <div>
        <p className="text-sm font-medium">Últimos checkouts</p>
        {data.recent.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">Nenhum pagamento stub ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10">
            {data.recent.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  {e.venueName}{" "}
                  <span className="text-white/40">/{e.venueSlug}</span>
                </span>
                <span className="text-white/70">
                  {e.planName} · {paymentMethodLabel(e.method)} · {formatBrlFromCents(e.amountCents)} ·{" "}
                  {new Date(e.createdAt).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
