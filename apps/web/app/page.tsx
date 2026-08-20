import Link from "next/link";
import { PlanMarketingCards } from "../components/plan-cards";
import { planCtaPrice } from "../components/plan-price";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { loadBillingPlans } from "../lib/load-billing-plans";

export default async function HomePage() {
  const catalog = await loadBillingPlans();
  const listed = catalog.plans.filter((p) => p.listed !== false);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div>
              <p className="eyebrow">SaaS para bares</p>
              <h1 className="mt-4 font-serif text-4xl leading-[1.08] tracking-tight text-ink sm:text-6xl">
                O cardápio no celular.
                <span className="block text-chili">A fila, na tela do bar.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
                Uma URL sua — tipo <span className="font-medium text-ink">/bar-do-tiao</span>. Sem app
                para instalar, sem tablet sujo na mesa. Pedido pelo QR do garçom entra depois; o link
                público nunca abre comanda sozinho.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                {listed.map((plan, i) => (
                  <Link
                    key={plan.id}
                    href={`/cadastro?plano=${plan.id}`}
                    className={i === 0 ? "btn-primary" : "btn-secondary"}
                  >
                    Adquirir {plan.name} · {planCtaPrice(plan)}
                  </Link>
                ))}
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
                {[
                  [`${catalog.trialDays} dias`, "de trial"],
                  ["0%", "comissão"],
                  [`${listed.length} ${listed.length === 1 ? "plano" : "planos"}`, "agora"],
                ].map(([k, v]) => (
                  <div key={v}>
                    <dt className="font-serif text-2xl text-ink">{k}</dt>
                    <dd className="text-ink-soft">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-br from-chili/20 via-amber/10 to-sage/20 blur-2xl" />
              <div className="surface overflow-hidden p-1">
                <div className="rounded-[1.15rem] bg-night px-5 pb-6 pt-4 text-white">
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/45">
                    eaimesa.com.br/bar-do-tiao
                  </p>
                  <h2 className="mt-3 font-serif text-3xl">Bar do Tião</h2>
                  <div className="mt-5 space-y-3">
                    {[
                      ["Calabresa acebolada", "R$ 32,90"],
                      ["Chopp 500 ml", "R$ 14,00"],
                      ["Caipirinha", "R$ 22,00"],
                    ].map(([name, price]) => (
                      <div
                        key={name}
                        className="flex items-baseline justify-between gap-4 rounded-2xl bg-white/10 px-4 py-3"
                      >
                        <span className="text-white/90">{name}</span>
                        <span className="tabular-nums text-amber">{price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-card/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Cadastre o bar",
                d: "E-mail, senha e um slug. Em minutos você tem /seu-bar no ar.",
              },
              {
                n: "02",
                t: "Publique o cardápio",
                d: "Categorias, foto e preço no servidor. No Auto atendimento, mesas e equipe entram depois.",
              },
              {
                n: "03",
                t: "Opere a fila",
                d: "No Auto atendimento o cliente pede no celular. Kanban no painel e na tela do garçom.",
              },
            ].map((s) => (
              <div key={s.n} className="surface p-6">
                <p className="font-serif text-3xl text-chili/80">{s.n}</p>
                <h3 className="mt-3 font-serif text-2xl">{s.t}</h3>
                <p className="mt-2 text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="eyebrow">Planos</p>
          <h2 className="mt-3 font-serif text-4xl">Escolha o que o bar precisa</h2>
          <p className="mt-3 max-w-xl text-ink-soft">
            Dois tipos de produto — Cardápio ou Auto atendimento — e quantos SKUs o operador
            cadastrar. Trial de {catalog.trialDays} dias; depois cobra o valor do plano (ou a promo,
            se houver). Pagamento (cartão ou PIX) no painel — ainda sem gateway.
          </p>
          <div className="mt-10">
            <PlanMarketingCards plans={catalog.plans} trialDays={catalog.trialDays} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
