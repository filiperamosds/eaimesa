"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Logo } from "./site-chrome";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bares", label: "Bares" },
  { href: "/admin/planos", label: "Planos" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<{ account: { email: string; name: string } } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ account: { email: string; name: string } }>("/v1/platform/auth/me")
      .then(setMe)
      .catch(() => {
        setErr("Sessão inválida");
        router.replace("/admin/login");
      });
  }, [router]);

  async function logout() {
    await api("/v1/platform/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night text-white/60">
        {err ?? "Carregando console…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Logo invert />
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-wider text-amber">
              Console
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-white/50 sm:inline">{me.account.email}</span>
            <button type="button" onClick={() => void logout()} className="btn-ghost text-white/80">
              Sair
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-5 pb-3">
          {LINKS.map((l) => {
            const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white"
                    : "rounded-full px-3 py-1.5 text-sm text-white/55 hover:text-white"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </div>
  );
}
