"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { MoneyField } from "./masked-fields";

type PlanRow = {
  id: string;
  name: string;
  priceCents: number;
  blurb: string;
  features: string[];
  listed: boolean;
};

type PlansPayload = {
  trialDays: number;
  paidPeriodDays: number;
  plans: PlanRow[];
};

export function AdminPlans() {
  const [data, setData] = useState<PlansPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PlanRow>>({});
  const [trialDays, setTrialDays] = useState(7);
  const [paidPeriodDays, setPaidPeriodDays] = useState(30);

  async function load() {
    const me = await api<PlansPayload>("/v1/platform/plans");
    setData(me);
    setTrialDays(me.trialDays);
    setPaidPeriodDays(me.paidPeriodDays);
    setDrafts(Object.fromEntries(me.plans.map((p) => [p.id, { ...p, features: [...p.features] }])));
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar planos."));
  }, []);

  async function savePlan(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setPending(id);
    setError(null);
    setOk(null);
    try {
      await api(`/v1/platform/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name,
          priceCents: draft.priceCents,
          blurb: draft.blurb,
          features: draft.features.filter((f) => f.trim()),
          listed: draft.listed,
        }),
      });
      setOk("Plano salvo. Landing e cadastro usam o valor novo.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(null);
    }
  }

  async function saveSettings() {
    setPending("settings");
    setError(null);
    setOk(null);
    try {
      await api("/v1/platform/settings", {
        method: "PATCH",
        body: JSON.stringify({ trialDays, paidPeriodDays }),
      });
      setOk("Trial e vigência atualizados.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(null);
    }
  }

  if (!data) return <p className="text-white/55">{error ?? "Carregando…"}</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Catálogo</p>
        <h1 className="mt-2 font-serif text-3xl">Planos</h1>
        <p className="mt-2 text-sm text-white/55">
          O que você grava aqui aparece na landing, no cadastro e no checkout do dono.
        </p>
      </div>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {ok ? <p className="text-sm text-sage-soft">{ok}</p> : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="font-medium">Trial e vigência</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Dias de trial</span>
            <input
              className="field bg-white/5 text-white"
              type="number"
              min={0}
              max={90}
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-white/60">Dias da vigência paga (stub)</span>
            <input
              className="field bg-white/5 text-white"
              type="number"
              min={1}
              max={366}
              value={paidPeriodDays}
              onChange={(e) => setPaidPeriodDays(Number(e.target.value))}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void saveSettings()}
          className="btn-primary mt-4 !py-2 text-sm"
        >
          Salvar prazos
        </button>
      </div>

      {data.plans.map((p) => {
        const d = drafts[p.id] ?? p;
        return (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">{p.id}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-white/60">Nome</span>
                <input
                  className="field bg-white/5 text-white"
                  value={d.name}
                  onChange={(e) => setDrafts((cur) => ({ ...cur, [p.id]: { ...d, name: e.target.value } }))}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-white/60">Preço mensal</span>
                <MoneyField
                  className="field bg-white/5 text-white"
                  cents={d.priceCents}
                  onCentsChange={(cents) =>
                    setDrafts((cur) => ({ ...cur, [p.id]: { ...d, priceCents: cents ?? 0 } }))
                  }
                />
                <span className="mt-1 block text-xs text-white/40">{formatBrlFromCents(d.priceCents)}/mês</span>
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-white/60">Texto curto</span>
              <input
                className="field bg-white/5 text-white"
                value={d.blurb}
                onChange={(e) => setDrafts((cur) => ({ ...cur, [p.id]: { ...d, blurb: e.target.value } }))}
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-white/60">O que inclui (um por linha)</span>
              <textarea
                className="field min-h-28 bg-white/5 text-white"
                value={d.features.join("\n")}
                onChange={(e) =>
                  setDrafts((cur) => ({ ...cur, [p.id]: { ...d, features: e.target.value.split("\n") } }))
                }
              />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.listed}
                onChange={(e) => setDrafts((cur) => ({ ...cur, [p.id]: { ...d, listed: e.target.checked } }))}
              />
              Listado na vitrine (landing / cadastro)
            </label>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void savePlan(p.id)}
              className="btn-primary mt-4 !py-2 text-sm"
            >
              Salvar {d.name}
            </button>
          </div>
        );
      })}
    </div>
  );
}
