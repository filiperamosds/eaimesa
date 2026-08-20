"use client";

import { formatBrlFromCents, PLAN_FUTURE, type PlanId } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Venue } from "../lib/types";

type BillingMe = {
  venue: Venue;
  entitlement: { ok: boolean; message?: string };
  canUpgrade: boolean;
  canDowngrade: boolean;
  plans: { id: PlanId; name: string; priceCents: number; blurb: string; features: string[] }[];
};

type CheckoutResult = {
  status: "success";
  provider: string;
  plan: string;
  planName: string;
  amountCents: number;
  subscriptionStatus: string;
  currentPeriodEndsAt: string;
  message: string;
};

export function BillingPanel() {
  const [data, setData] = useState<BillingMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CheckoutResult | null>(null);
  const [pending, setPending] = useState<PlanId | null>(null);

  async function load() {
    const me = await api<BillingMe>("/v1/billing/me");
    setData(me);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar o plano."));
  }, []);

  async function checkout(plan: PlanId) {
    setError(null);
    setSuccess(null);
    setPending(plan);
    try {
      const result = await api<CheckoutResult>("/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      setSuccess(result);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir o pagamento.");
    } finally {
      setPending(null);
    }
  }

  if (!data) {
    return <p className="text-ink-soft">{error ?? "Carregando plano…"}</p>;
  }

  const current = data.venue.plan as PlanId;

  return (
    <section className="space-y-4">
      <div className="surface p-5">
        <p className="eyebrow">Plano</p>
        <h2 className="mt-2 font-serif text-2xl">{data.venue.planName ?? current}</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Status: {data.venue.subscriptionStatus}
          {data.venue.subscriptionStatus === "trial" && data.venue.trialEndsAt
            ? ` · trial até ${new Date(data.venue.trialEndsAt).toLocaleDateString("pt-BR")}`
            : null}
          {data.venue.currentPeriodEndsAt
            ? ` · vigência até ${new Date(data.venue.currentPeriodEndsAt).toLocaleDateString("pt-BR")}`
            : null}
        </p>
        {!data.entitlement.ok ? (
          <p className="mt-3 text-sm text-chili">{data.entitlement.message}</p>
        ) : null}
      </div>

      {success ? (
        <div className="rounded-2xl border border-sage/40 bg-sage/10 p-5">
          <p className="text-sm font-medium text-sage">Pagamento aprovado</p>
          <p className="mt-1 text-sm">
            {success.planName} · {formatBrlFromCents(success.amountCents)} · stub ({success.provider})
          </p>
          <p className="mt-1 text-sm text-ink-soft">{success.message}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-chili">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {data.plans.map((p) => {
          const isCurrent = p.id === current;
          const upgrade = p.id === "auto_atendimento" && data.canUpgrade;
          const downgrade = p.id === "cardapio" && data.canDowngrade;
          const renew = isCurrent;
          const enabled = upgrade || downgrade || renew;
          return (
            <div key={p.id} className="surface p-5">
              <p className="font-serif text-xl">{p.name}</p>
              <p className="mt-1 font-medium text-chili">
                {formatBrlFromCents(p.priceCents)}
                <span className="text-sm font-normal text-ink-soft">/mês</span>
              </p>
              <p className="mt-2 text-sm text-ink-soft">{p.blurb}</p>
              <button
                type="button"
                disabled={!enabled || pending !== null}
                onClick={() => void checkout(p.id)}
                className="btn-primary mt-4 !py-2 text-sm disabled:opacity-50"
              >
                {pending === p.id
                  ? "Processando…"
                  : isCurrent
                    ? "Pagar / renovar"
                    : upgrade
                      ? "Subir para Auto atendimento"
                      : downgrade
                        ? "Descer para Cardápio"
                        : "Disponível no fim da vigência"}
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink-soft">
        {PLAN_FUTURE.name}: {PLAN_FUTURE.blurb} Checkout é stub — devolve sucesso, sem gateway.
      </p>
    </section>
  );
}
