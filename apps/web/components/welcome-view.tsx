"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const WELCOME_KEY = "eaimesa_welcome";

type WelcomeData = {
  slug: string;
  pin: string;
  tableLabel: string;
};

export function WelcomeView() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<WelcomeData | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(WELCOME_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as WelcomeData;
      if (parsed.slug === params.slug) {
        setData(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [params.slug]);

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="font-serif text-2xl">Bem-vindo</p>
        <p className="mt-4 text-ink-soft">
          Escaneie o QR do garçom para abrir a comanda e ver o PIN da mesa.
        </p>
        <Link href={`/${params.slug}`} className="btn-primary mt-8 inline-flex">
          Ver cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <p className="eyebrow">Comanda aberta</p>
      <h1 className="mt-2 font-serif text-3xl">{data.tableLabel}</h1>
      <p className="mt-3 text-ink-soft">Anote o PIN — outros na mesa usam o mesmo código.</p>
      <div
        className="surface mx-auto mt-10 max-w-xs rounded-3xl border-2 border-chili/30 px-6 py-10"
        aria-label={`PIN da mesa: ${data.pin.split("").join(" ")}`}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-ink-soft">PIN</p>
        <p className="mt-4 font-serif text-5xl tracking-[0.35em] text-chili">{data.pin}</p>
      </div>
      <Link href={`/${params.slug}`} className="btn-primary mt-10 inline-flex">
        Ver cardápio
      </Link>
      <p className="mt-6 text-xs text-ink-soft">Pedir pelo cardápio chega na fatia 6.</p>
    </div>
  );
}
