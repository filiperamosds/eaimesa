"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { ClaimResponse, Session, StaffTable } from "../lib/types";
import { ClaimQrModal } from "./claim-qr-modal";
import { StaffTableDialog } from "./staff-table-dialog";

type TablesPayload = { tables: StaffTable[] };

function isOccupied(table: StaffTable) {
  return table.sessionOpen || table.openTabCount > 0;
}

export function StaffBoard() {
  const [me, setMe] = useState<Session | null>(null);
  const [tables, setTables] = useState<StaffTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [activeClaim, setActiveClaim] = useState<ClaimResponse | null>(null);
  const [openTable, setOpenTable] = useState<StaffTable | null>(null);

  const refreshTables = useCallback(async () => {
    const data = await api<TablesPayload>("/v1/staff/tables");
    setTables(data.tables);
    return data.tables;
  }, []);

  useEffect(() => {
    Promise.all([api<Session>("/v1/auth/me"), api<TablesPayload>("/v1/staff/tables")])
      .then(([session, data]) => {
        setMe(session);
        setTables(data.tables);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!me) return;
    const id = window.setInterval(() => {
      void refreshTables().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(id);
  }, [me, refreshTables]);

  async function openClaim(table: StaffTable) {
    setError(null);
    setClaiming(table.id);
    try {
      const claim = await api<ClaimResponse>(`/v1/staff/tables/${table.id}/claims`, {
        method: "POST",
      });
      setActiveClaim(claim);
      await refreshTables();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gerar o QR.");
    } finally {
      setClaiming(null);
    }
  }

  async function onTableTap(table: StaffTable) {
    setError(null);
    try {
      const freshList = await refreshTables();
      const fresh = freshList.find((t) => t.id === table.id) ?? table;
      if (isOccupied(fresh)) {
        setOpenTable(fresh);
        return;
      }
      await openClaim(fresh);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir a mesa.");
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
        {me.venue.name} · toque numa mesa ocupada para ver as comandas; mesa livre gera QR
      </p>
      {error ? <p className="mt-4 text-sm text-chili">{error}</p> : null}
      {tables.length === 0 ? (
        <p className="mt-8 text-center text-ink-soft">Nenhuma mesa ativa. Peça ao dono para cadastrar.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((table) => {
            const occupied = isOccupied(table);
            const openTabs = table.openTabs ?? [];
            const openCount = table.openTabCount ?? openTabs.length;
            return (
              <li key={table.id}>
                <button
                  type="button"
                  disabled={claiming === table.id}
                  onClick={() => void onTableTap(table)}
                  className={`surface flex min-h-[5.5rem] w-full flex-col items-center justify-center rounded-2xl border px-3 py-4 text-center transition hover:shadow-md disabled:opacity-60 ${
                    occupied
                      ? "border-chili/50 bg-paper-2 hover:border-chili"
                      : "border-line hover:border-chili/40"
                  }`}
                >
                  <span className="font-serif text-xl">{table.label}</span>
                  {claiming === table.id ? (
                    <span className="mt-1 text-xs text-ink-soft">Gerando…</span>
                  ) : openTabs.length > 0 ? (
                    <>
                      <span className="mt-1 text-xs font-medium text-chili">
                        {openCount} comanda{openCount === 1 ? "" : "s"}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs text-ink">
                        {openTabs.map((t) => t.guestName).join(" · ")}
                      </span>
                    </>
                  ) : table.sessionOpen ? (
                    <span className="mt-1 text-xs text-ink-soft">Mesa aberta · sem comanda ainda</span>
                  ) : table.claimPending ? (
                    <span className="mt-1 text-xs text-ink-soft">QR ativo</span>
                  ) : (
                    <span className="mt-1 text-xs text-ink-soft">Abrir mesa</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {openTable ? (
        <StaffTableDialog
          tableId={openTable.id}
          tableLabel={openTable.label}
          onClose={() => {
            setOpenTable(null);
            void refreshTables();
          }}
          onGenerateQr={() => {
            const t = openTable;
            setOpenTable(null);
            void openClaim(t);
          }}
          onChanged={() => void refreshTables()}
        />
      ) : null}
      {activeClaim ? (
        <ClaimQrModal
          venueName={me.venue.name}
          tableLabel={activeClaim.tableLabel}
          claimUrl={activeClaim.claimUrl}
          expiresAt={activeClaim.expiresAt}
          onClose={() => {
            setActiveClaim(null);
            void refreshTables();
          }}
        />
      ) : null}
    </div>
  );
}
