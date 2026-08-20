"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { StaffTableTab, StaffTableTabsPayload } from "../lib/types";

type Props = {
  tableId: string;
  tableLabel: string;
  onClose: () => void;
  onGenerateQr: () => void;
  onChanged: () => void;
};

export function StaffTableDialog({ tableId, tableLabel, onClose, onGenerateQr, onChanged }: Props) {
  const [data, setData] = useState<StaffTableTabsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(opts?: { silent?: boolean }) {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const payload = await api<StaffTableTabsPayload>(`/v1/staff/tables/${tableId}/tabs`);
      setData(payload);
      setSelectedId((cur) => {
        if (cur && payload.tabs.some((t) => t.id === cur)) return cur;
        return payload.tabs[0]?.id ?? null;
      });
      setError(null);
    } catch (err) {
      if (!opts?.silent) {
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar as comandas.");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load({ silent: true });
    }, 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  const selected: StaffTableTab | undefined = data?.tabs.find((t) => t.id === selectedId);
  const openCount = data?.table.openTabCount ?? 0;

  async function closeTab(tabId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/v1/staff/tabs/${tabId}/close`, { method: "POST" });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível fechar a comanda.");
    } finally {
      setBusy(false);
    }
  }

  async function closeTable() {
    setBusy(true);
    setError(null);
    try {
      await api(`/v1/staff/tables/${tableId}/close`, { method: "POST" });
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível encerrar a mesa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-table-title"
    >
      <div className="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-5">
        <p className="eyebrow">Contas da mesa</p>
        <h2 id="staff-table-title" className="mt-2 font-serif text-2xl">
          {tableLabel}
        </h2>
        {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}
        {loading ? (
          <p className="py-10 text-center text-ink-soft">Carregando…</p>
        ) : !data || data.tabs.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">Nenhuma comanda nesta mesa ainda.</p>
        ) : (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {data.tabs.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left ${
                      selectedId === t.id ? "border-chili/50 bg-paper-2" : "border-line bg-card"
                    }`}
                  >
                    <span>
                      <span className="font-medium">{t.guestName}</span>
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        {t.guestPhoneMasked}
                        {t.status === "closed" ? " · fechada" : ""}
                      </span>
                    </span>
                    <span className="text-sm font-medium tabular-nums text-chili">
                      {formatBrlFromCents(t.totalCents)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {selected ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-sm font-medium">{selected.guestName} — parcial</p>
                {selected.orders.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">Nenhum pedido nesta comanda ainda.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {selected.orders.map((order) => (
                      <li key={order.id} className="text-sm">
                        <p className="text-xs uppercase tracking-wide text-ink-soft">{order.status}</p>
                        {order.items.map((item) => (
                          <p key={item.id}>
                            {item.qty}× {item.name}
                          </p>
                        ))}
                        <p className="tabular-nums text-chili">{formatBrlFromCents(order.totalCents)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {selected.status === "open" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void closeTab(selected.id)}
                    className="btn-secondary mt-4 w-full text-sm"
                  >
                    Fechar comanda de {selected.guestName}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onGenerateQr} className="btn-secondary text-sm">
            Novo QR
          </button>
          <button
            type="button"
            disabled={busy || openCount > 0}
            onClick={() => void closeTable()}
            className="btn-secondary text-sm disabled:opacity-50"
            title={openCount > 0 ? "Feche todas as comandas primeiro" : undefined}
          >
            Encerrar mesa
          </button>
          <button type="button" onClick={onClose} className="btn-primary !py-2 text-sm">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
