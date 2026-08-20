"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { planAllowsService } from "@eaimesa/shared";
import { api } from "../lib/api";
import type { Session } from "../lib/types";
import { Logo } from "./site-chrome";

const ALL_LINKS = [
  { href: "/painel/pedidos", label: "Pedidos", icon: "▣", service: true },
  { href: "/painel/cardapio", label: "Cardápio", icon: "☰", service: false },
  { href: "/painel/mesas", label: "Mesas", icon: "⊞", service: true },
  { href: "/painel/equipe", label: "Equipe", icon: "◎", service: true },
  { href: "/painel/bar", label: "Meu bar", icon: "⌂", service: false },
] as const;

export function PainelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Session | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((session) => {
        if (session.role === "staff") {
          router.replace("/garcom");
          return;
        }
        setMe(session);
        const service = planAllowsService(session.venue.planKind ?? session.venue.plan);
        if (!service && (path.startsWith("/painel/pedidos") || path.startsWith("/painel/mesas") || path.startsWith("/painel/equipe"))) {
          router.replace("/painel/cardapio");
        }
      })
      .catch(() => {
        setErr("Sessão inválida");
        router.replace("/login");
      });
  }, [router, path]);

  async function logout() {
    await api("/v1/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft">
        {err ?? "Carregando painel…"}
      </div>
    );
  }

  const links = ALL_LINKS.filter((l) => !l.service || planAllowsService(me.venue.planKind ?? me.venue.plan));

  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-1 text-sm">
            <Link href={`/${me.venue.slug}`} className="btn-ghost hidden sm:inline-flex">
              Ver cardápio
            </Link>
            <button type="button" onClick={logout} className="btn-ghost">
              Sair
            </button>
          </div>
        </div>
        <div className="mx-auto hidden max-w-[88rem] px-5 pb-3 sm:block">
          <PainelNav path={path} links={links} />
        </div>
      </header>
      <div className="mx-auto max-w-[88rem] px-5 py-6">{children}</div>
      <nav
        aria-label="Painel"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur-xl sm:hidden"
      >
        <ul className={`grid px-2 py-2 ${links.length > 2 ? "grid-cols-5" : "grid-cols-2"}`}>
          {links.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] ${
                    active ? "text-chili" : "text-ink-soft"
                  }`}
                >
                  <span className="text-base leading-none" aria-hidden>
                    {l.icon}
                  </span>
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function PainelNav({
  path,
  links,
}: {
  path: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label="Painel" className="flex rounded-2xl bg-paper-2/80 p-1">
      {links.map((l) => {
        const active = path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "flex-1 rounded-xl bg-card px-3 py-2.5 text-center text-sm font-medium text-chili shadow-sm"
                : "flex-1 rounded-xl px-3 py-2.5 text-center text-sm text-ink-soft hover:text-ink"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
