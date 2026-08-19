"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Venue } from "../lib/types";

export function VenueSettings() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<Venue>("/v1/owner/venue").then((v) => {
      setVenue(v);
      setName(v.name);
      setSlug(v.slug);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setPending(true);
    try {
      const v = await api<Venue>("/v1/owner/venue", {
        method: "PATCH",
        body: JSON.stringify({ name, slug }),
      });
      setVenue(v);
      setMsg("Salvo. A URL pública do cardápio mudou se você alterou o slug.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  if (!venue) return <p className="text-ink-soft">Carregando…</p>;

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Nome</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Slug (URL)</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="field"
          required
        />
        <p className="mt-1 text-xs text-ink-soft">
          Cardápio em /{slug} · id interno {venue.publicId}
        </p>
      </label>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {msg ? <p className="text-sm text-sage">{msg}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary !py-2">
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
