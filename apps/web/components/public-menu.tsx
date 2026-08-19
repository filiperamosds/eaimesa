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
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-night text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(226,60,20,0.35),transparent_45%)]" />
        <div className="relative mx-auto max-w-lg px-5 py-12 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/50">Cardápio</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{menu.venue.name}</h1>
          {suspended ? (
            <p className="mt-4 text-sm text-amber">Assinatura inativa — só leitura.</p>
          ) : (
            <p className="mt-4 text-sm text-white/65">Toque no item para ver foto e descrição.</p>
          )}
        </div>
      </header>

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

      <main className="mx-auto max-w-lg px-5 pb-16 pt-8">
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
                        <div className="space-y-3 px-3 pb-4">
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
        <Link href="/" className="font-medium text-ink underline decoration-chili/40">
          EaiMesa
        </Link>
      </footer>
    </div>
  );
}
