"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OpenComandaForm } from "./open-comanda-form";

const WELCOME_KEY = "eaimesa_welcome";

type WelcomeData = {
  slug: string;
  pin: string | null;
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
          Escaneie o QR do garçom ou entre com o PIN da mesa para abrir sua comanda.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/${params.slug}/entrar`} className="btn-primary inline-flex">
            Tenho o PIN
          </Link>
          <Link href={`/${params.slug}`} className="btn-secondary inline-flex">
            Ver cardápio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <p className="eyebrow">Mesa aberta</p>
      <h1 className="mt-2 font-serif text-3xl">{data.tableLabel}</h1>
      {data.pin ? (
        <>
          <p className="mt-3 text-ink-soft">
            Anote o PIN — outros na mesa entram com o mesmo código e abrem a <strong>própria</strong>{" "}
            comanda.
          </p>
          <div
            className="surface mx-auto mt-8 max-w-xs rounded-3xl border-2 border-chili/30 px-6 py-10"
            aria-label={`PIN da mesa: ${data.pin.split("").join(" ")}`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-ink-soft">PIN</p>
            <p className="mt-4 font-serif text-5xl tracking-[0.35em] text-chili">{data.pin}</p>
          </div>
        </>
      ) : (
        <p className="mt-3 text-ink-soft">Identifique-se para abrir sua comanda nesta mesa.</p>
      )}
      <OpenComandaForm slug={params.slug} />
      <Link href={`/${params.slug}`} className="btn-ghost mt-6 inline-flex">
        Ver cardápio
      </Link>
    </div>
  );
}
