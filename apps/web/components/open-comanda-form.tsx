"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import type { OpenComandaResponse } from "../lib/types";
import { PhoneField } from "./masked-fields";

export function OpenComandaForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await api<OpenComandaResponse>("/v1/guest/tabs", {
        method: "POST",
        body: JSON.stringify({ name, phone }),
      });
      router.replace(result.redirectPath || `/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir a comanda.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-xs space-y-4 text-left">
      <label className="block">
        <span className="mb-1 block text-sm text-ink-soft">Seu nome</span>
        <input
          className="field"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-ink-soft">Telefone</span>
        <PhoneField className="field" value={phone} onValueChange={setPhone} required />
      </label>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Abrindo…" : "Abrir minha comanda"}
      </button>
    </form>
  );
}
