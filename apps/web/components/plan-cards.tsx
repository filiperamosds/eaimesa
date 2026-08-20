import Link from "next/link";
import { formatBrlFromCents, PLAN_FUTURE, type PlanId } from "@eaimesa/shared";
import type { BillingPlan } from "../lib/load-billing-plans";

const DEMOS: Record<PlanId, { href: string; label: string }> = {
  cardapio: { href: "/cafe-da-lina", label: "Ver demo Café da Lina" },
  auto_atendimento: { href: "/bar-do-tiao", label: "Ver demo Bar do Tião" },
};

export function PlanMarketingCards({
  plans,
  trialDays,
}: {
  plans: BillingPlan[];
  trialDays: number;
}) {
  const listed = plans.filter((p) => p.listed !== false);
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2">
        {listed.map((plan) => {
          const featured = plan.id === "auto_atendimento";
          const demo = DEMOS[plan.id];
          return (
            <article
              key={plan.id}
              className={`surface flex flex-col p-8 ${featured ? "ring-2 ring-chili/30" : ""}`}
            >
              {featured ? (
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-chili">Mais completo</p>
              ) : (
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-chili">Plano</p>
              )}
              <h3 className="mt-3 font-serif text-3xl">{plan.name}</h3>
              <p className="mt-3 font-serif text-4xl tabular-nums">
                {formatBrlFromCents(plan.priceCents)}
                <span className="text-xl font-sans text-ink-soft">/mês</span>
              </p>
              <p className="mt-3 text-sm text-ink-soft">{plan.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                {plan.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href={`/cadastro?plano=${plan.id}`} className="btn-primary mt-8 w-full">
                Adquirir {plan.name} · {formatBrlFromCents(plan.priceCents)}/mês
              </Link>
              {demo ? (
                <Link href={demo.href} className="mt-3 block text-center text-sm text-ink-soft underline">
                  {demo.label}
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        {PLAN_FUTURE.name}: {PLAN_FUTURE.blurb} Trial de {trialDays} dias; a cobrança do valor do plano
        entra depois.
      </p>
    </div>
  );
}
