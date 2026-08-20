"use client";

import { PLANS } from "@eaimesa/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { BillingPlan, BillingPlansPayload } from "../lib/load-billing-plans";
import type { LoginResponse } from "../lib/types";
import { PlanPrice } from "./plan-price";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function resolveRedirect(result: LoginResponse) {
    const target = next?.startsWith("/") ? next : result.redirectPath;
    if (result.role === "staff" && target.startsWith("/painel")) {
      return "/garcom";
    }
    return target;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await api<LoginResponse>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(resolveRedirect(result));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha no login.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field
        label="Senha"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Garçom? Use o mesmo login — você vai para{" "}
        <Link href="/login?next=/garcom" className="font-medium text-ink underline">
          /garcom
        </Link>
        .
      </p>
      <p className="text-center text-sm text-ink-soft">
        Novo bar?{" "}
        <Link href="/cadastro" className="font-medium text-ink underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const requested = useSearchParams().get("plano");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [venueName, setVenueName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState(requested && requested.length >= 3 ? requested : "cardapio");
  const [plans, setPlans] = useState<BillingPlan[]>(Object.values(PLANS));
  const [trialDays, setTrialDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<BillingPlansPayload>("/v1/billing/plans")
      .then((data) => {
        const listed = data.plans.filter((p) => p.listed !== false);
        if (listed.length) setPlans(listed);
        setTrialDays(data.trialDays);
        setPlan((cur) => (listed.some((p) => p.id === cur) ? cur : (listed[0]?.id ?? cur)));
      })
      .catch(() => {
        /* fallback PLANS */
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await api<LoginResponse>("/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, venueName, slug, plan }),
      });
      router.push(result.redirectPath || "/painel/cardapio");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nome do bar" value={venueName} onChange={setVenueName} placeholder="Bar do Tião" />
      <div>
        <Field
          label="URL do cardápio"
          value={slug}
          onChange={setSlug}
          placeholder="bar-do-tiao"
        />
        <p className="mt-1 text-xs text-ink-soft">eaimesa.com.br/{slug || "seu-slug"}</p>
      </div>
      <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field
        label="Senha"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Plano (trial de {trialDays} dias)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {plans.map((p) => (
            <label
              key={p.id}
              className={`cursor-pointer rounded-2xl border px-3 py-3 text-sm ${
                plan === p.id ? "border-chili bg-chili/5" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={plan === p.id}
                onChange={() => setPlan(p.id)}
                className="sr-only"
              />
              <span className="block font-medium">{p.name}</span>
              <span className="mt-1 block text-chili">
                <PlanPrice
                  priceCents={p.priceCents}
                  promoPriceCents={p.promoPriceCents}
                  suffix="/mês"
                  className="text-base"
                />
              </span>
              <span className="mt-1 block text-xs text-ink-soft">{p.blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Criando…" : "Criar cardápio"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-ink underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="field"
        required
      />
    </label>
  );
}
