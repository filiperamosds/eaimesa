"use client";

import { PLAN_BAR_MAX_STAFF } from "@eaimesa/shared";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { StaffMember } from "../lib/types";

type StaffPayload = {
  staff: StaffMember[];
  maxActive: number;
  activeCount: number;
};

export function StaffEditor() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [maxActive, setMaxActive] = useState(PLAN_BAR_MAX_STAFF);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function load() {
    const data = await api<StaffPayload>("/v1/owner/staff");
    setStaff(data.staff);
    setMaxActive(data.maxActive);
    setActiveCount(data.activeCount);
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
      await api("/v1/owner/staff", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar.");
    }
  }

  async function toggleActive(row: StaffMember) {
    setError(null);
    try {
      await api(`/v1/owner/staff/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !row.active }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover este garçom? Ele não poderá mais entrar.")) return;
    setError(null);
    try {
      await api(`/v1/owner/staff/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  if (loading) return <p className="text-ink-soft">Carregando equipe…</p>;

  return (
    <div>
      <div className="surface mb-6 border-sage/20 bg-sage-soft/40 p-4 text-sm text-ink-soft">
        <p className="font-medium text-ink">Garçons entram em /login (mesmo acesso do painel).</p>
        <p className="mt-1">
          Cada garçom escolhe a mesa e gera o QR de comanda para o cliente. Máximo {maxActive} ativos no
          plano Auto atendimento.
        </p>
      </div>
      <p className="mb-6 text-sm text-ink-soft">
        {activeCount}/{maxActive} garçons ativos
      </p>
      <form onSubmit={add} className="surface mb-8 space-y-3 p-4">
        <p className="font-medium">Novo garçom</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="field"
            required
            minLength={2}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="field"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha (mín. 8)"
            className="field"
            required
            minLength={8}
          />
        </div>
        <button type="submit" className="btn-primary !py-2 text-sm">
          Cadastrar garçom
        </button>
      </form>
      {error ? <p className="mb-4 text-sm text-chili">{error}</p> : null}
      <ul className="space-y-2">
        {staff.length === 0 ? (
          <li className="text-sm text-ink-soft">Nenhum garçom cadastrado.</li>
        ) : (
          staff.map((row) => (
            <li
              key={row.id}
              className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-ink-soft">{row.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    row.active ? "bg-sage-soft text-sage" : "bg-paper-2 text-ink-soft"
                  }`}
                >
                  {row.active ? "Ativo" : "Inativo"}
                </span>
                <button type="button" onClick={() => void toggleActive(row)} className="btn-ghost text-sm">
                  {row.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(row.id)}
                  className="btn-ghost text-sm text-chili"
                >
                  Remover
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
