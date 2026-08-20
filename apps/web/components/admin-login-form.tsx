"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { Logo } from "./site-chrome";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api("/v1/platform/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha no login.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <Logo className="mb-8" />
      <p className="eyebrow">Console</p>
      <h1 className="mt-2 font-serif text-3xl">Operação EaiMesa</h1>
      <p className="mt-2 mb-8 text-ink-soft">Login da plataforma — não é o painel do bar.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">E-mail</span>
          <input
            className="field"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Senha</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-chili">{error}</p> : null}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Entrando…" : "Entrar no console"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-soft">
        Dono do bar?{" "}
        <Link href="/login" className="font-medium text-ink underline">
          Login do estabelecimento
        </Link>
      </p>
    </div>
  );
}
