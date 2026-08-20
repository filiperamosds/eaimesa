import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

export default function HomePage() {
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
                <Link href="/cadastro?plano=cardapio" className="btn-primary">
                  Adquirir Cardápio
                </Link>
                <Link href="/cadastro?plano=auto_atendimento" className="btn-secondary">
                  Adquirir Auto atendimento
                </Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
                {[
                  ["7 dias", "de trial"],
                  ["0%", "comissão"],
                  ["2 planos", "agora"],
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
            Trial de 7 dias. A cobrança entra depois — por enquanto o checkout só confirma sucesso, sem
            gateway. Equipamento na mesa fica para uma fatia futura.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="surface p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-chili">Cardápio</p>
              <p className="mt-3 font-serif text-4xl">
                R$ 49<span className="text-xl text-ink-soft">/mês</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                <li>URL pública do cardápio</li>
                <li>Categorias, itens e foto</li>
                <li>QR do cardápio</li>
                <li>Sem pedido no celular</li>
              </ul>
              <Link href="/cadastro?plano=cardapio" className="btn-primary mt-8 w-full">
                Adquirir Cardápio
              </Link>
              <Link href="/cafe-da-lina" className="mt-3 block text-center text-sm text-ink-soft underline">
                Ver demo Café da Lina
              </Link>
            </div>
            <div className="surface p-8 ring-2 ring-chili/30">
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-chili">
                Auto atendimento
              </p>
              <p className="mt-3 font-serif text-4xl">
                R$ 149<span className="text-xl text-ink-soft">/mês</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                <li>Tudo do Cardápio</li>
                <li>Mesas, equipe, QR do garçom e PIN</li>
                <li>Pedido e parcial no celular</li>
                <li>Kanban no painel e no garçom</li>
              </ul>
              <Link href="/cadastro?plano=auto_atendimento" className="btn-primary mt-8 w-full">
                Adquirir Auto atendimento
              </Link>
              <Link href="/bar-do-tiao" className="mt-3 block text-center text-sm text-ink-soft underline">
                Ver demo Bar do Tião
              </Link>
            </div>
            <div className="surface p-8 opacity-80">
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-ink-soft">Em breve</p>
              <p className="mt-3 font-serif text-3xl">Equipamento na mesa</p>
              <p className="mt-4 text-sm text-ink-soft">
                Tablet/hardware na mesa. Fora desta fatia — não dá para adquirir agora.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
