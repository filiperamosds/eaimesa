"use client";

import { formatBrlFromCents, PLAN_FUTURE, type PaymentMethod, type PlanId } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Venue } from "../lib/types";
import { PaymentForm } from "./payment-form";

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
  method?: string;
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
  const [pending, setPending] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);

  async function load() {
    const me = await api<BillingMe>("/v1/billing/me");
    setData(me);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar o plano."));
  }, []);

  async function pay(plan: PlanId, method: PaymentMethod) {
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const result = await api<CheckoutResult>("/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan, method }),
      });
      setSuccess(result);
      setCheckoutPlan(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir o pagamento.");
    } finally {
      setPending(false);
    }
  }

  if (!data) {
    return <p className="text-ink-soft">{error ?? "Carregando plano…"}</p>;
  }

  const current = data.venue.plan as PlanId;
  const selected = data.plans.find((p) => p.id === checkoutPlan);

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
            {success.planName} · {formatBrlFromCents(success.amountCents)}
            {success.method ? ` · ${success.method === "pix" ? "PIX" : "cartão"}` : null} · stub (
            {success.provider})
          </p>
          <p className="mt-1 text-sm text-ink-soft">{success.message}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-chili">{error}</p> : null}

      {selected ? (
        <PaymentForm
          planId={selected.id}
          planName={selected.name}
          amountCents={selected.priceCents}
          pending={pending}
          onCancel={() => {
            if (!pending) setCheckoutPlan(null);
          }}
          onPay={(method) => void pay(selected.id, method)}
        />
      ) : (
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
                <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                  {p.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={!enabled || pending}
                  onClick={() => {
                    setSuccess(null);
                    setError(null);
                    setCheckoutPlan(p.id);
                  }}
                  className="btn-primary mt-4 !py-2 text-sm disabled:opacity-50"
                >
                  {isCurrent
                    ? `Pagar ${formatBrlFromCents(p.priceCents)}`
                    : upgrade
                      ? `Subir · ${formatBrlFromCents(p.priceCents)}/mês`
                      : downgrade
                        ? `Descer · ${formatBrlFromCents(p.priceCents)}/mês`
                        : "Disponível no fim da vigência"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-ink-soft">
        {PLAN_FUTURE.name}: {PLAN_FUTURE.blurb} Cartão e PIX são só UI; a API espera ~2s e devolve sucesso.
      </p>
    </section>
  );
}
