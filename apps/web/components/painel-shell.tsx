"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";
import { Logo } from "./site-chrome";

const LINKS = [
  { href: "/painel/pedidos", label: "Pedidos" },
  { href: "/painel/cardapio", label: "Cardápio" },
  { href: "/painel/bar", label: "Meu bar" },
] as const;

export function PainelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Session | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then(setMe)
      .catch(() => {
        setErr("Sessão inválida");
        router.replace("/login");
      });
  }, [router]);

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

  return (
    <div className="min-h-screen bg-paper pb-16 sm:pb-0">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/${me.venue.slug}`} className="hidden text-ink-soft hover:text-ink sm:inline">
              Ver cardápio
            </Link>
            <button type="button" onClick={logout} className="text-ink-soft hover:text-ink">
              Sair
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-[88rem] px-5 pb-3">
          <PainelNav path={path} />
        </div>
      </header>
      <div className="mx-auto max-w-[88rem] px-5 py-6">{children}</div>
    </div>
  );
}

function PainelNav({ path }: { path: string }) {
  return (
    <nav aria-label="Painel" className="flex rounded-2xl bg-paper-2 p-1">
      {LINKS.map((l) => {
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
