"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { planAllowsService } from "@eaimesa/shared";
import { api } from "../../lib/api";
import type { Session } from "../../lib/types";

export default function PainelIndex() {
  const router = useRouter();
  useEffect(() => {
    api<Session>("/v1/auth/me")
      .then((session) => {
        router.replace(planAllowsService(session.venue.planKind ?? session.venue.plan) ? "/painel/pedidos" : "/painel/cardapio");
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  return <p className="text-ink-soft">Abrindo painel…</p>;
}
