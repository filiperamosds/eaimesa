"use client";

import { formatBrlFromCents, newUuid } from "@eaimesa/shared";
import { useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { GuestOrder } from "../lib/types";
import { GuestPartial } from "./guest-partial";

export type CartLine = {
  catalogItemId: string;
  name: string;
  priceCents: number;
  qty: number;
  note: string;
  maxNoteLength: number;
};

type Props = {
  cart: CartLine[];
  onChange: (next: CartLine[]) => void;
  canOrder: boolean;
  orders: GuestOrder[];
  partialCents: number;
  onOrdered: () => void;
};

export function GuestCart({ cart, onChange, canOrder, orders, partialCents, onOrdered }: Props) {
  const [open, setOpen] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);

  const cartCents = cart.reduce((s, l) => s + l.priceCents * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  if (count === 0 && orders.length === 0) return null;

  function setQty(id: string, qty: number) {
    if (qty <= 0) {
      onChange(cart.filter((l) => l.catalogItemId !== id));
      return;
    }
    onChange(cart.map((l) => (l.catalogItemId === id ? { ...l, qty } : l)));
  }

  async function submit() {
    if (!canOrder || cart.length === 0 || sending.current) return;
    sending.current = true;
    setPending(true);
    setError(null);
    const key = newUuid();
    try {
      await api<GuestOrder>("/v1/guest/orders", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          note: orderNote.trim() || null,
          items: cart.map((l) => ({
            catalogItemId: l.catalogItemId,
            qty: l.qty,
            note: l.note.trim() || null,
          })),
        }),
      });
      onChange([]);
      setOrderNote("");
      onOrdered();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o pedido.");
    } finally {
      setPending(false);
      sending.current = false;
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          {count > 0 ? (
            <p className="text-sm">
              <span className="font-medium">
                {count} {count === 1 ? "item" : "itens"}
              </span>
              <span className="ml-2 tabular-nums text-chili">{formatBrlFromCents(cartCents)}</span>
            </p>
          ) : (
            <p className="text-sm">
              <span className="font-medium">Parcial</span>
              <span className="ml-2 tabular-nums text-chili">{formatBrlFromCents(partialCents)}</span>
            </p>
          )}
          <button type="button" className="btn-primary !py-2 text-sm" onClick={() => setOpen(true)}>
            {count > 0 ? "Ver cesta" : "Ver comanda"}
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-title"
        >
          <div className="surface flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-5">
            <h2 id="cart-title" className="font-serif text-2xl">
              {count > 0 ? "Seu pedido" : "Sua comanda"}
            </h2>
            {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}
            <div className="mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto">
              {orders.length > 0 ? (
                <section>
                  <p className="mb-2 text-sm font-medium">Já na comanda</p>
                  <GuestPartial orders={orders} totalCents={partialCents} />
                </section>
              ) : null}
              {cart.length === 0 ? (
                orders.length === 0 ? (
                  <p className="text-sm text-ink-soft">Cesta vazia. Adicione itens no cardápio.</p>
                ) : (
                  <p className="text-sm text-ink-soft">Cesta vazia. Adicione mais itens no cardápio.</p>
                )
              ) : (
                <section>
                  {orders.length > 0 ? <p className="mb-2 text-sm font-medium">Cesta</p> : null}
                  <ul className="space-y-3">
                    {cart.map((line) => (
                      <li key={line.catalogItemId} className="border-b border-line pb-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium">{line.name}</span>
                          <span className="tabular-nums text-chili">
                            {formatBrlFromCents(line.priceCents * line.qty)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            className="btn-secondary !px-3 !py-1 text-sm"
                            onClick={() => setQty(line.catalogItemId, line.qty - 1)}
                          >
                            −
                          </button>
                          <span className="w-6 text-center tabular-nums">{line.qty}</span>
                          <button
                            type="button"
                            className="btn-secondary !px-3 !py-1 text-sm"
                            onClick={() => setQty(line.catalogItemId, Math.min(99, line.qty + 1))}
                          >
                            +
                          </button>
                        </div>
                        <input
                          className="field mt-2 text-sm"
                          placeholder="Nota do item (opcional)"
                          maxLength={line.maxNoteLength}
                          value={line.note}
                          onChange={(e) =>
                            onChange(
                              cart.map((l) =>
                                l.catalogItemId === line.catalogItemId ? { ...l, note: e.target.value } : l,
                              ),
                            )
                          }
                        />
                      </li>
                    ))}
                  </ul>
                  <label className="mt-3 block text-sm">
                    <span className="mb-1 block text-ink-soft">Nota do pedido</span>
                    <textarea
                      className="field"
                      rows={2}
                      maxLength={280}
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                    />
                  </label>
                </section>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary text-sm" onClick={() => setOpen(false)}>
                Fechar
              </button>
              {cart.length > 0 ? (
                <button
                  type="button"
                  disabled={pending || !canOrder}
                  className="btn-primary !py-2 text-sm"
                  onClick={() => void submit()}
                >
                  {pending ? "Enviando…" : "Enviar à cozinha"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
