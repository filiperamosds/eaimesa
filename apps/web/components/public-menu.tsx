"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import Link from "next/link";
import { useState } from "react";
import { mediaSrc } from "../lib/media";
import type { PublicMenu } from "../lib/types";

export function PublicMenuView({ menu }: { menu: PublicMenu }) {
  const groups = menu.categories.filter((c) => c.items.length > 0);
  const [openId, setOpenId] = useState<string | null>(null);
  const suspended = menu.venue.subscriptionStatus === "suspended";

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-card">
        <div className="mx-auto max-w-lg px-5 py-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-ink-soft">Cardápio</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight">{menu.venue.name}</h1>
          {suspended ? (
            <p className="mt-3 text-sm text-chili">Assinatura inativa — só leitura.</p>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Toque no item para ver foto e descrição.</p>
          )}
        </div>
      </header>

      {groups.length > 0 ? (
        <nav
          className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md"
          aria-label="Grupos do cardápio"
        >
          <ul className="mx-auto flex max-w-lg gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((g) => (
              <li key={g.id} className="shrink-0">
                <a
                  href={`#grupo-${g.id}`}
                  className="inline-block rounded-full border border-line bg-card px-3.5 py-1.5 text-sm text-ink hover:border-chili/40 hover:text-chili"
                >
                  {g.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <main className="mx-auto max-w-lg px-5 pb-16 pt-6">
        {groups.length === 0 ? (
          <p className="py-16 text-center text-ink-soft">Cardápio em montagem.</p>
        ) : (
          groups.map((group) => (
            <section key={group.id} id={`grupo-${group.id}`} className="scroll-mt-20 pb-10">
              <div className="mb-3 flex items-end gap-3">
                <h2 className="font-serif text-2xl text-chili">{group.name}</h2>
                <span className="mb-1 h-px flex-1 bg-line" />
                <span className="mb-0.5 text-[11px] uppercase tracking-wider text-ink-soft">
                  {group.items.length} {group.items.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <ul className="overflow-hidden rounded-2xl border border-line bg-card">
                {group.items.map((item, i) => {
                  const photo = mediaSrc(item.imageUrl);
                  const expandable = Boolean(item.description || photo);
                  const open = openId === item.id;
                  return (
                    <li key={item.id} className={i > 0 ? "border-t border-line" : ""}>
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
                            className="h-14 w-14 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="h-14 w-14 shrink-0 rounded-xl bg-paper-2" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="font-medium leading-snug">{item.name}</span>
                            <span className="shrink-0 tabular-nums text-ink">
                              {formatBrlFromCents(item.priceCents)}
                            </span>
                          </span>
                        </span>
                        {expandable ? (
                          <span
                            className={`shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
                            aria-hidden
                          >
                            ▾
                          </span>
                        ) : null}
                      </button>
                      {expandable && open ? (
                        <div className="space-y-3 px-3 pb-4">
                          {photo ? (
                            <img
                              src={photo}
                              alt={item.name}
                              className="max-h-64 w-full rounded-xl object-cover"
                            />
                          ) : null}
                          {item.description ? (
                            <p className="text-sm leading-relaxed text-ink-soft">{item.description}</p>
                          ) : null}
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

      <footer className="pb-10 text-center text-xs text-ink-soft">
        Cardápio por{" "}
        <Link href="/" className="underline">
          EaiMesa
        </Link>
      </footer>
    </div>
  );
}
