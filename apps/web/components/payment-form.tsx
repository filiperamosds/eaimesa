"use client";

import { formatBrlFromCents, hasPromoPrice, type PaymentMethod } from "@eaimesa/shared";
import { useState } from "react";
import { PlanPrice } from "./plan-price";

type Props = {
  planId: string;
  planName: string;
  amountCents: number;
  listPriceCents?: number;
  promoPriceCents?: number | null;
  pending: boolean;
  onCancel: () => void;
  onPay: (method: PaymentMethod) => void;
};

function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

export function PaymentForm({
  planId,
  planName,
  amountCents,
  listPriceCents,
  promoPriceCents,
  pending,
  onCancel,
  onPay,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const amount = formatBrlFromCents(amountCents);
  const pixCode = `eaimesa-stub-${planId}-${amountCents}`;

  function formatCard(raw: string) {
    const digits = onlyDigits(raw, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }

  function formatExpiry(raw: string) {
    const digits = onlyDigits(raw, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (method === "card") {
      const digits = onlyDigits(number, 16);
      if (digits.length < 13) {
        setLocalError("Informe o número do cartão.");
        return;
      }
      if (holder.trim().length < 3) {
        setLocalError("Informe o nome impresso no cartão.");
        return;
      }
      if (onlyDigits(expiry, 4).length !== 4) {
        setLocalError("Validade no formato MM/AA.");
        return;
      }
      if (onlyDigits(cvv, 4).length < 3) {
        setLocalError("Informe o CVV.");
        return;
      }
    }
    onPay(method);
  }

  return (
    <form onSubmit={submit} className="surface space-y-5 p-5" aria-busy={pending}>
      <div>
        <p className="eyebrow">Pagar agora</p>
        <h3 className="mt-2 font-serif text-2xl">{planName}</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Cobrança de{" "}
          {hasPromoPrice({ priceCents: listPriceCents ?? amountCents, promoPriceCents }) ? (
            <PlanPrice
              priceCents={listPriceCents ?? amountCents}
              promoPriceCents={promoPriceCents}
              suffix=""
              className="font-medium text-ink"
            />
          ) : (
            <span className="font-medium text-ink">{amount}</span>
          )}{" "}
          (mensal). Sem gateway nesta fatia — o formulário não envia dados do cartão.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["card", "Cartão"],
            ["pix", "PIX"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={pending}
            onClick={() => setMethod(id)}
            className={`rounded-2xl border px-3 py-2.5 text-sm ${
              method === id ? "border-chili bg-chili/5 font-medium" : "border-line"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {method === "card" ? (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Número do cartão</span>
            <input
              className="field font-mono tracking-wide"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="ACCT-000003"
              value={number}
              disabled={pending}
              onChange={(e) => setNumber(formatCard(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nome no cartão</span>
            <input
              className="field"
              autoComplete="cc-name"
              placeholder="Como está impresso"
              value={holder}
              disabled={pending}
              onChange={(e) => setHolder(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Validade</span>
              <input
                className="field"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                value={expiry}
                disabled={pending}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">CVV</span>
              <input
                className="field"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                value={cvv}
                disabled={pending}
                onChange={(e) => setCvv(onlyDigits(e.target.value, 4))}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-paper-2/60 p-4">
          <p className="text-sm font-medium">PIX (simulado)</p>
          <p className="mt-1 text-sm text-ink-soft">
            Código de teste — não é um PIX real. Confirme para o stub aprovar {amount}.
          </p>
          <p className="mt-3 break-all rounded-xl bg-card px-3 py-2 font-mono text-xs">{pixCode}</p>
        </div>
      )}

      {localError ? <p className="text-sm text-chili">{localError}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Confirmando pagamento…" : `Pagar ${amount}`}
        </button>
        <button type="button" disabled={pending} onClick={onCancel} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
