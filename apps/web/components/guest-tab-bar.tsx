"use client";

import { formatBrlFromCents } from "@eaimesa/shared";
import Link from "next/link";
import type { GuestTab } from "../lib/types";

export function GuestTabBar({
  slug,
  tab,
  partialCents = 0,
  showJoin = true,
}: {
  slug: string;
  tab: GuestTab | null | undefined;
  partialCents?: number;
  showJoin?: boolean;
}) {
  if (!showJoin) {
    return null;
  }

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
          Abrir sua comanda para pedir
        </Link>
      </div>
    );
  }

  if (tab && !tab.needsProfile) {
    return (
      <div className="border-b border-sage/30 bg-sage px-5 py-3 text-center text-sm text-white">
        <span className="font-medium">{tab.guestName}</span>
        <span className="text-white/80"> · {tab.tableLabel}</span>
        {partialCents > 0 ? (
          <span className="text-white/90"> · {formatBrlFromCents(partialCents)}</span>
        ) : null}
        <Link href={`/${slug}/comanda`} className="ml-2 font-medium underline decoration-white/40">
          Parcial
        </Link>
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
