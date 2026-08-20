"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { GuestTab } from "../lib/types";

export function GuestTabBar({ slug }: { slug: string }) {
  const [tab, setTab] = useState<GuestTab | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api<GuestTab>("/v1/guest/tab");
        if (cancelled) return;
        setTab(data.slug === slug ? data : null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 409)) {
          setTab(null);
          return;
        }
        setTab(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (tab === undefined) {
    return (
      <div className="border-b border-white/10 bg-night/40 px-5 py-3 text-center text-sm text-white/60">
        Conferindo comanda…
      </div>
    );
  }

  if (tab?.needsProfile) {
    return (
      <div className="border-b border-amber/40 bg-night/70 px-5 py-3 text-center text-sm text-white">
        Você está na {tab.tableLabel}.{" "}
        <Link href={`/${slug}/comanda`} className="font-medium text-amber underline decoration-amber/40">
          Abrir sua comanda
        </Link>
      </div>
    );
  }

  if (tab && !tab.needsProfile) {
    return (
      <div className="border-b border-sage/30 bg-sage px-5 py-3 text-center text-sm text-white">
        <span className="font-medium">{tab.guestName}</span>
        <span className="text-white/80"> · {tab.tableLabel}</span>
        <span className="text-white/70"> · pedir pelo cardápio chega na próxima fatia</span>
      </div>
    );
  }

  return (
    <div className="border-b border-white/10 bg-night/50 px-5 py-3 text-center text-sm text-white/80">
      Já tem o PIN?{" "}
      <Link href={`/${slug}/entrar`} className="font-medium text-amber underline decoration-amber/40">
        Entrar na mesa
      </Link>
    </div>
  );
}
