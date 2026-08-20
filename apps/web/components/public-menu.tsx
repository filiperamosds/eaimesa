"use client";

import { formatBrlFromCents, planAllowsService } from "@eaimesa/shared";
import Link from "next/link";
import { useState } from "react";
import { GuestCart, type CartLine } from "./guest-cart";
import { GuestTabBar } from "./guest-tab-bar";
import { mediaSrc } from "../lib/media";
import { useGuestOrders } from "../lib/use-guest-orders";
import { useGuestTab } from "../lib/use-guest-tab";
import type { PublicMenu } from "../lib/types";

export function PublicMenuView({ menu }: { menu: PublicMenu }) {
  const groups = menu.categories.filter((c) => c.items.length > 0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const ordering =
    planAllowsService(menu.venue.planKind ?? menu.venue.plan ?? "") && Boolean(menu.venue.acceptsOrders);
  const tab = useGuestTab(menu.venue.slug, ordering);
  const suspended = menu.venue.subscriptionStatus === "suspended";
  const canOrder = Boolean(ordering && tab && !tab.needsProfile && !suspended);
  const hasTab = Boolean(ordering && tab && !tab.needsProfile);
  const { orders, totalCents, reload } = useGuestOrders(hasTab);

  function addItem(item: PublicMenu["categories"][number]["items"][number]) {
    setCart((cur) => {
      const existing = cur.find((l) => l.catalogItemId === item.id);
      if (existing) {
        return cur.map((l) =>
          l.catalogItemId === item.id ? { ...l, qty: Math.min(99, l.qty + 1) } : l,
        );
      }
      return [
        ...cur,
        {
          catalogItemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          qty: 1,
          note: "",
          maxNoteLength: item.maxNoteLength ?? 80,
        },
      ];
    });
  }

  const qtyOf = (id: string) => cart.find((l) => l.catalogItemId === id)?.qty ?? 0;

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-night text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(226,60,20,0.35),transparent_45%)]" />
        <div className="relative mx-auto max-w-lg px-5 py-12 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/50">Cardápio</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{menu.venue.name}</h1>
          {suspended ? (
            <p className="mt-4 text-sm text-amber">Assinatura inativa — só leitura.</p>
          ) : canOrder ? (
            <p className="mt-4 text-sm text-white/65">Toque em adicionar e envie o pedido pela cesta.</p>
          ) : ordering ? (
            <p className="mt-4 text-sm text-white/65">
              Cardápio só leitura até entrar na mesa. Peça o QR do garçom ou use o PIN.
            </p>
          ) : null}
        </div>
      </header>
      {ordering ? (
        <GuestTabBar slug={menu.venue.slug} tab={tab} partialCents={totalCents} showJoin />
      ) : null}

      {groups.length > 0 ? (
        <nav
          className="sticky top-0 z-20 border-b border-line/80 bg-paper/80 backdrop-blur-xl"
          aria-label="Grupos do cardápio"
        >
          <ul className="mx-auto flex max-w-lg gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((g) => (
              <li key={g.id} className="shrink-0">
                <a
                  href={`#grupo-${g.id}`}
                  className="inline-block rounded-full border border-line bg-card px-3.5 py-1.5 text-sm text-ink shadow-sm hover:border-chili/40 hover:text-chili"
                >
                  {g.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <main className={`mx-auto max-w-lg px-5 pb-16 pt-8 ${cart.length > 0 || orders.length > 0 ? "pb-28" : ""}`}>
        {groups.length === 0 ? (
          <p className="py-16 text-center text-ink-soft">Cardápio em montagem.</p>
        ) : (
          groups.map((group) => (
            <section key={group.id} id={`grupo-${group.id}`} className="scroll-mt-24 pb-10">
              <div className="mb-4 flex items-end gap-3">
                <h2 className="font-serif text-2xl">{group.name}</h2>
                <span className="mb-1 h-px flex-1 bg-line" />
                <span className="mb-0.5 text-[11px] uppercase tracking-wider text-ink-soft">
                  {group.items.length} {group.items.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <ul className="space-y-3">
                {group.items.map((item) => {
                  const photo = mediaSrc(item.imageUrl);
                  const expandable = Boolean(item.description || photo);
                  const open = openId === item.id;
                  const qty = qtyOf(item.id);
                  return (
                    <li key={item.id} className="surface overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          if (!expandable) return;
                          setOpenId((cur) => (cur === item.id ? null : item.id));
                        }}
                        disabled={!expandable}
                        aria-expanded={expandable ? open : undefined}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left disabled:cursor-default"
                      >
                        {photo ? (
                          <img
                            src={photo}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                          />
                        ) : (
                          <span className="h-16 w-16 shrink-0 rounded-2xl bg-paper-2" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="font-medium leading-snug">{item.name}</span>
                            <span className="shrink-0 font-medium tabular-nums text-chili">
                              {formatBrlFromCents(item.priceCents)}
                            </span>
                          </span>
                          {!open && item.description ? (
                            <span className="mt-0.5 line-clamp-1 block text-sm text-ink-soft">
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      {expandable && open ? (
                        <div className="space-y-3 px-3 pb-2">
                          {photo ? (
                            <img
                              src={photo}
                              alt={item.name}
                              className="max-h-72 w-full rounded-2xl object-cover"
                            />
                          ) : null}
                          {item.description ? (
                            <p className="text-sm leading-relaxed text-ink-soft">{item.description}</p>
                          ) : null}
                        </div>
                      ) : null}
                      {ordering && !suspended ? (
                        <div className="flex justify-end px-3 pb-3">
                          {canOrder ? (
                            <button
                              type="button"
                              onClick={() => addItem(item)}
                              className="btn-secondary !px-3 !py-1.5 text-sm"
                            >
                              {qty > 0 ? `Adicionar · ${qty}` : "Adicionar"}
                            </button>
                          ) : tab?.needsProfile ? (
                            <Link href={`/${menu.venue.slug}/comanda`} className="btn-secondary !px-3 !py-1.5 text-sm">
                              Abrir comanda
                            </Link>
                          ) : (
                            <Link href={`/${menu.venue.slug}/entrar`} className="btn-secondary !px-3 !py-1.5 text-sm">
                              Entrar para pedir
                            </Link>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </main>

      {ordering ? (
        <GuestCart
          cart={cart}
          onChange={setCart}
          canOrder={canOrder}
          orders={orders}
          partialCents={totalCents}
          onOrdered={() => void reload()}
        />
      ) : null}

      <footer className="pb-10 text-center text-xs text-ink-soft">
        Cardápio por{" "}
        <Link href="/" className="font-medium text-ink underline decoration-chili/40">
          EaiMesa
        </Link>
      </footer>
    </div>
  );
}
