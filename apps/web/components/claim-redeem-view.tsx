"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

const WELCOME_KEY = "eaimesa_welcome";

type RedeemResult = {
  pinDisplay: string | null;
  tableLabel: string;
  slug: string;
  needsProfile: boolean;
  redirectPath: string;
};

export function ClaimRedeemView() {
  const params = useParams<{ slug: string; token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slug = params.slug;
    const token = params.token;
    if (!slug || !token) return;

    let cancelled = false;

    async function redeem() {
      try {
        const result = await api<RedeemResult>(
          `/v1/public/venues/${encodeURIComponent(slug)}/c/${encodeURIComponent(token)}/redeem`,
          { method: "POST" },
        );
        if (cancelled) return;
        sessionStorage.setItem(
          WELCOME_KEY,
          JSON.stringify({
            slug: result.slug,
            pin: result.pinDisplay,
            tableLabel: result.tableLabel,
          }),
        );
        router.replace(result.redirectPath);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Não foi possível abrir a comanda.");
      }
    }

    void redeem();
    return () => {
      cancelled = true;
    };
  }, [params.slug, params.token, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="font-serif text-2xl">Comanda</p>
        <p className="mt-4 text-chili">{error}</p>
        <p className="mt-6 text-sm text-ink-soft">Peça um novo QR ao garçom ou entre com o PIN da mesa.</p>
        {params.slug ? (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/${params.slug}/entrar`} className="btn-primary inline-flex">
              Tenho o PIN
            </Link>
            <Link href={`/${params.slug}`} className="btn-secondary inline-flex">
              Ver cardápio
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="text-ink-soft">Abrindo comanda…</p>
    </div>
  );
}
