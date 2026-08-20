"use client";

import { PLAN_BAR_MAX_TABLES } from "@eaimesa/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Venue, VenueTable } from "../lib/types";
import { MenuQrModal } from "./menu-qr-modal";

type TablesPayload = {
  tables: VenueTable[];
  maxActive: number;
  activeCount: number;
};

export function TablesEditor() {
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [maxActive, setMaxActive] = useState(PLAN_BAR_MAX_TABLES);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [qrTable, setQrTable] = useState<VenueTable | null>(null);

  async function load() {
    const [tablesData, venueData] = await Promise.all([
      api<TablesPayload>("/v1/owner/tables"),
      api<Venue>("/v1/owner/venue"),
    ]);
    setTables(tablesData.tables);
    setMaxActive(tablesData.maxActive);
    setActiveCount(tablesData.activeCount);
    setVenue(venueData);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/v1/owner/tables", { method: "POST", body: JSON.stringify({ label }) });
      setLabel("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar.");
    }
  }

  if (loading) return <p className="text-ink-soft">Carregando mesas…</p>;

  return (
    <div>
      <div className="surface mb-6 border-sage/20 bg-sage-soft/40 p-4 text-sm text-ink-soft">
        <p className="font-medium text-ink">QR fixo = cardápio. QR do garçom = comanda.</p>
        <p className="mt-1">
          Exporte o QR de cada mesa e cole no salão. Para abrir comanda, o garçom gera o QR em{" "}
          <strong className="font-medium text-ink">/garcom</strong> (cadastre a equipe em Equipe).
        </p>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {activeCount}/{maxActive} mesas ativas no plano Auto atendimento. Pedido de balcão escolhe daqui.
        </p>
        <Link href="/painel/pedidos" className="text-sm font-medium text-chili">
          Ir para pedidos →
        </Link>
      </div>
      <form onSubmit={add} className="mb-6 flex flex-wrap gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nova mesa (ex. Mesa 11)"
          className="field min-w-56 flex-1"
          required
          maxLength={40}
        />
        <button type="submit" className="btn-primary !py-2 text-sm">
          Adicionar
        </button>
      </form>
      {error ? <p className="mb-4 text-sm text-chili">{error}</p> : null}
      {tables.length === 0 ? (
        <p className="text-ink-soft">Nenhuma mesa ainda. Comece por Balcão e Mesa 1.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onChange={load}
              onError={setError}
              onQr={() => setQrTable(table)}
            />
          ))}
        </ul>
      )}
      {qrTable && venue ? (
        <MenuQrModal
          slug={venue.slug}
          venueName={venue.name}
          tableLabel={qrTable.label}
          onClose={() => setQrTable(null)}
        />
      ) : null}
    </div>
  );
}

function TableCard({
  table,
  onChange,
  onError,
  onQr,
}: {
  table: VenueTable;
  onChange: () => Promise<void>;
  onError: (m: string | null) => void;
  onQr: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(table.label);

  async function save() {
    onError(null);
    try {
      await api(`/v1/owner/tables/${table.id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: name }),
      });
      setEditing(false);
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao salvar.");
    }
  }

  async function toggle() {
    onError(null);
    try {
      await api(`/v1/owner/tables/${table.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !table.active }),
      });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Falha ao atualizar.");
    }
  }

  async function remove() {
    if (!confirm("Remover esta mesa? Pedidos antigos guardam o nome.")) return;
    onError(null);
    try {
      await api(`/v1/owner/tables/${table.id}`, { method: "DELETE" });
      await onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <li className={`surface p-4 ${table.active ? "" : "opacity-60"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`grid h-12 w-12 place-items-center rounded-full border-2 ${
            table.active ? "border-chili/40 bg-chili/10 text-chili" : "border-line bg-paper-2 text-ink-soft"
          } font-serif text-sm`}
          aria-hidden
        >
          ⌂
        </span>
        <span className={`text-[11px] uppercase tracking-wider ${table.active ? "text-sage" : "text-ink-soft"}`}>
          {table.active ? "ativa" : "oculta"}
        </span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" maxLength={40} />
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={save} className="font-medium text-sage">
              Salvar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-ink-soft">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="font-serif text-xl">{table.label}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={onQr} className="font-medium text-chili hover:text-chili-dark">
          QR cardápio
        </button>
        <button type="button" onClick={() => setEditing(true)} className="text-ink-soft hover:text-ink">
          Renomear
        </button>
        <button type="button" onClick={toggle} className="text-ink-soft hover:text-ink">
          {table.active ? "Ocultar" : "Ativar"}
        </button>
        <button type="button" onClick={remove} className="text-chili">
          Excluir
        </button>
      </div>
    </li>
  );
}
