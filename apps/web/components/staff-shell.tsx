"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";
import { Logo } from "./site-chrome";

const LINKS = [
  { href: "/garcom", label: "Mesas", exact: true },
  { href: "/garcom/pedidos", label: "Pedidos", exact: false },
] as const;

export function StaffShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Session | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const onPedidos = path.startsWith("/garcom/pedidos");

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((session) => {
        if (session.role === "staff" || session.role === "owner") {
          setMe(session);
          return;
        }
        setErr("Sem permissão");
        router.replace("/login?next=/garcom");
      })
      .catch(() => {
        setErr("Sessão inválida");
        router.replace("/login?next=/garcom");
      });
  }, [router]);

  async function logout() {
    await api("/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft">
        {err ?? "Carregando…"}
      </div>
    );
  }

  const displayName =
    me.role === "staff" ? (me.member?.name ?? me.account.email) : me.account.email;

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-ink-soft sm:inline">{displayName}</span>
            {me.role === "owner" ? (
              <Link href="/painel/pedidos" className="btn-ghost">
                Painel
              </Link>
            ) : null}
            <button type="button" onClick={() => void logout()} className="btn-ghost">
              Sair
            </button>
          </div>
        </div>
        <div className="mx-auto hidden max-w-[88rem] px-5 pb-3 sm:block">
          <nav aria-label="Garçom" className="flex max-w-md rounded-2xl bg-paper-2/80 p-1">
            {LINKS.map((l) => {
              const active = l.exact ? path === l.href : path.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    active
                      ? "flex-1 rounded-xl bg-card px-3 py-2 text-center text-sm font-medium text-chili shadow-sm"
                      : "flex-1 rounded-xl px-3 py-2 text-center text-sm text-ink-soft hover:text-ink"
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div className={`mx-auto px-5 py-6 ${onPedidos ? "max-w-[88rem]" : "max-w-lg"}`}>
        {onPedidos ? null : (
          <>
            <p className="eyebrow">Garçom</p>
            <h1 className="mt-1 font-serif text-2xl">Mesas</h1>
          </>
        )}
        {children}
      </div>
      <nav
        aria-label="Garçom"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur-xl sm:hidden"
      >
        <ul className="grid grid-cols-2 px-2 py-2">
          {LINKS.map((l) => {
            const active = l.exact ? path === l.href : path.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`block rounded-xl py-2 text-center text-sm ${
                    active ? "font-medium text-chili" : "text-ink-soft"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <footer className="mx-auto max-w-lg px-5 pb-8 text-center text-xs text-ink-soft">
        <Link href={`/${me.venue.slug}`} className="underline">
          Ver cardápio público
        </Link>
      </footer>
    </div>
  );
}
