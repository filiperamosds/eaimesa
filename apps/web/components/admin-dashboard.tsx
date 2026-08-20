"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

type Dash = {
  venues: {
    total: number;
    byStatus: Record<string, number>;
    byPlan: Record<string, number>;
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
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium">Por status</p>
          <ul className="mt-3 space-y-1 text-sm text-white/70">
            {Object.entries(data.venues.byStatus).map(([k, n]) => (
              <li key={k} className="flex justify-between">
                <span>{k}</span>
                <span>{n}</span>
              </li>
            ))}
            <li className="flex justify-between text-amber">
              <span>trial vencido</span>
              <span>{data.venues.trialExpired}</span>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium">Por plano</p>
          <ul className="mt-3 space-y-1 text-sm text-white/70">
            {Object.entries(data.venues.byPlan).map(([k, n]) => (
              <li key={k} className="flex justify-between">
                <span>{k}</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
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
                  {e.planName} · {e.method} · {formatBrlFromCents(e.amountCents)} ·{" "}
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
