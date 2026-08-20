"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import type { JoinTabResponse } from "../lib/types";

export function PinJoinView() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setError(null);
    setPending(true);
    try {
      const result = await api<JoinTabResponse>("/v1/guest/tabs/join", {
        method: "POST",
        body: JSON.stringify({ slug, pin }),
      });
      router.replace(result.redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar na comanda.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <p className="eyebrow">Comanda</p>
      <h1 className="mt-2 font-serif text-3xl">PIN da mesa</h1>
      <p className="mt-3 text-ink-soft">
        Quem já escaneou o QR do garçom vê o código de 4 dígitos. Depois você abre a <strong>sua</strong>{" "}
        comanda com nome e telefone.
      </p>
      <form onSubmit={onSubmit} className="mx-auto mt-10 max-w-xs space-y-5">
        <label className="block text-left">
          <span className="sr-only">PIN de 4 dígitos</span>
          <input
            className="field text-center font-serif text-4xl tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            aria-invalid={error ? true : undefined}
          />
        </label>
        {error ? <p className="text-sm text-chili">{error}</p> : null}
        <button type="submit" disabled={pending || pin.length !== 4} className="btn-primary w-full">
          {pending ? "Entrando…" : "Entrar na mesa"}
        </button>
      </form>
      {slug ? (
        <Link href={`/${slug}`} className="btn-ghost mt-8 inline-flex">
          Voltar ao cardápio
        </Link>
      ) : null}
    </div>
  );
}
