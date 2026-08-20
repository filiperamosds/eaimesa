"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { StaffSession } from "../lib/types";
import { Logo } from "./site-chrome";

export function StaffShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<StaffSession | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<StaffSession>("/v1/staff/auth/me")
      .then(setMe)
      .catch(() => {
        setErr("Sessão inválida");
        router.replace("/garcom/login");
      });
  }, [router]);

  async function logout() {
    await api("/v1/staff/auth/logout", { method: "POST" });
    router.push("/garcom/login");
    router.refresh();
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-soft">
        {err ?? "Carregando…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
          <Logo />
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-ink-soft sm:inline">{me.staff.name}</span>
            <button type="button" onClick={() => void logout()} className="btn-ghost">
              Sair
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-5 py-6">
        <p className="eyebrow">Garçom</p>
        <h1 className="mt-1 font-serif text-2xl">Mesas</h1>
        {children}
      </div>
      <footer className="mx-auto max-w-lg px-5 pb-8 text-center text-xs text-ink-soft">
        <Link href={`/${me.venue.slug}`} className="underline">
          Ver cardápio público
        </Link>
      </footer>
    </div>
  );
}
