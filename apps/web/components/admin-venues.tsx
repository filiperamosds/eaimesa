"use client";

import { useEffect, useState } from "react";
import { planLabel, statusLabel } from "../lib/admin-copy";
import { api, ApiError } from "../lib/api";

type VenueRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planName: string;
  subscriptionStatus: string;
  ownerEmail: string;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  createdAt: string;
};

type CatalogPlan = { id: string; name: string };

export function AdminVenues() {
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<VenueRow[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (plan) params.set("plan", plan);
    if (status) params.set("status", status);
    const qs = params.toString();
    const [data, catalog] = await Promise.all([
      api<{ venues: VenueRow[] }>(`/v1/platform/venues${qs ? `?${qs}` : ""}`),
      api<{ plans: CatalogPlan[] }>("/v1/platform/plans"),
    ]);
    setRows(data.venues);
    setPlans(catalog.plans);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao listar."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(id: string, action: "suspend" | "unsuspend") {
    setPending(id);
    setError(null);
    try {
      await api(`/v1/platform/venues/${id}/${action}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Tenants</p>
        <h1 className="mt-2 font-serif text-3xl">Estabelecimentos</h1>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao listar."));
        }}
      >
        <input
          className="field-night max-w-xs"
          placeholder="Nome ou slug"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="field-night max-w-[12rem]" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">Todos os planos</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="field-night max-w-[12rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="trial">Em trial</option>
          <option value="active">Ativo</option>
          <option value="suspended">Suspenso</option>
          <option value="past_due">Inadimplente</option>
        </select>
        <button type="submit" className="btn-secondary !bg-white/10 !text-white">
          Filtrar
        </button>
      </form>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {rows.map((v) => (
          <li key={v.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {v.name} <span className="text-white/40">/{v.slug}</span>
              </p>
              <p className="mt-1 text-sm text-white/55">
                {planLabel(v.plan, v.planName)} · {statusLabel(v.subscriptionStatus)} · {v.ownerEmail}
              </p>
            </div>
            {v.subscriptionStatus === "suspended" ? (
              <button
                type="button"
                disabled={pending === v.id}
                onClick={() => void act(v.id, "unsuspend")}
                className="btn-secondary !bg-white/10 !text-white !py-2 text-sm"
              >
                Reativar
              </button>
            ) : (
              <button
                type="button"
                disabled={pending === v.id}
                onClick={() => void act(v.id, "suspend")}
                className="btn-ghost text-sm text-amber"
              >
                Suspender
              </button>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-white/45">Nenhum bar com esse filtro.</p> : null}
    </div>
  );
}
