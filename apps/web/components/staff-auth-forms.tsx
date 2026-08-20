"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import type { StaffSession } from "../lib/types";

export function StaffLoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/garcom";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api<StaffSession>("/v1/staff/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(next.startsWith("/") ? next : "/garcom");
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
        {pending ? "Entrando…" : "Entrar como garçom"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Dono do bar?{" "}
        <Link href="/login" className="font-medium text-ink underline">
          Painel gerencial
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
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="field"
        required
      />
    </label>
  );
}
