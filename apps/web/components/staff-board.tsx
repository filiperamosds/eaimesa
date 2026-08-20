"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { ClaimResponse, StaffSession, StaffTable } from "../lib/types";
import { ClaimQrModal } from "./claim-qr-modal";

type TablesPayload = { tables: StaffTable[] };

export function StaffBoard() {
  const [me, setMe] = useState<StaffSession | null>(null);
  const [tables, setTables] = useState<StaffTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [activeClaim, setActiveClaim] = useState<ClaimResponse | null>(null);

  useEffect(() => {
    Promise.all([api<StaffSession>("/v1/staff/auth/me"), api<TablesPayload>("/v1/staff/tables")])
      .then(([session, data]) => {
        setMe(session);
        setTables(data.tables);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  async function openClaim(table: StaffTable) {
    setError(null);
    setClaiming(table.id);
    try {
      const claim = await api<ClaimResponse>(`/v1/staff/tables/${table.id}/claims`, {
        method: "POST",
      });
      setActiveClaim(claim);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gerar o QR.");
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return <p className="flex min-h-[40vh] items-center justify-center text-ink-soft">Carregando mesas…</p>;
  }

  if (!me) {
    return (
      <p className="flex min-h-[40vh] items-center justify-center text-chili">{error ?? "Sessão inválida."}</p>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">
        {me.venue.name} · toque na mesa para gerar o QR da comanda
      </p>
      {error ? <p className="mt-4 text-sm text-chili">{error}</p> : null}
      {tables.length === 0 ? (
        <p className="mt-8 text-center text-ink-soft">Nenhuma mesa ativa. Peça ao dono para cadastrar.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((table) => (
            <li key={table.id}>
              <button
                type="button"
                disabled={claiming === table.id}
                onClick={() => void openClaim(table)}
                className="surface flex min-h-[5.5rem] w-full flex-col items-center justify-center rounded-2xl border border-line px-3 py-4 text-center transition hover:border-chili/40 hover:shadow-md disabled:opacity-60"
              >
                <span className="font-serif text-xl">{table.label}</span>
                <span className="mt-1 text-xs text-ink-soft">
                  {claiming === table.id ? "Gerando…" : "Abrir comanda"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {activeClaim ? (
        <ClaimQrModal
          venueName={me.venue.name}
          tableLabel={activeClaim.tableLabel}
          claimUrl={activeClaim.claimUrl}
          expiresAt={activeClaim.expiresAt}
          onClose={() => setActiveClaim(null)}
        />
      ) : null}
    </div>
  );
}
