"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Venue } from "../lib/types";
import { MenuQrModal } from "./menu-qr-modal";

export function VenueSettings() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showQr, setShowQr] = useState(false);

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
    <div className="max-w-lg space-y-8">
      <form onSubmit={onSubmit} className="space-y-4">
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

      <section className="surface p-5">
        <p className="eyebrow">QR do cardápio</p>
        <h2 className="mt-2 font-serif text-xl">Para porta, Instagram ou mesa</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Mesmo destino do QR fixo das mesas: <span className="font-medium text-ink">/{venue.slug}</span>.
          Só leitura — comanda abre com o QR do garçom.
        </p>
        <button type="button" onClick={() => setShowQr(true)} className="btn-secondary mt-4 !py-2 text-sm">
          Ver e exportar QR
        </button>
      </section>

      {showQr ? (
        <MenuQrModal
          slug={venue.slug}
          venueName={venue.name}
          onClose={() => setShowQr(false)}
        />
      ) : null}
    </div>
  );
}
