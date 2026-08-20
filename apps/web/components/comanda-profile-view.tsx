"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { OpenComandaForm } from "./open-comanda-form";

export function ComandaProfileView() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <p className="eyebrow">Sua comanda</p>
      <h1 className="mt-2 font-serif text-3xl">Nome e telefone</h1>
      <p className="mt-3 text-ink-soft">
        Cada pessoa na mesa tem a própria conta. O mesmo telefone retoma a comanda noutro celular.
      </p>
      {slug ? <OpenComandaForm slug={slug} /> : null}
      {slug ? (
        <Link href={`/${slug}`} className="btn-ghost mt-6 inline-flex">
          Voltar ao cardápio
        </Link>
      ) : null}
    </div>
  );
}
