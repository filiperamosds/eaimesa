"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/types";
import { Logo } from "./site-chrome";

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

  const links = [
    { href: "/painel/cardapio", label: "Cardápio" },
    { href: "/painel/bar", label: "Meu bar" },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="flex gap-4 text-sm">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={path.startsWith(l.href) ? "font-medium text-chili" : "text-ink-soft hover:text-ink"}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/${me.venue.slug}`} className="hidden text-ink-soft hover:text-ink sm:inline">
              Ver cardápio
            </Link>
            <button type="button" onClick={logout} className="text-ink-soft hover:text-ink">
              Sair
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">{children}</div>
    </div>
  );
}
