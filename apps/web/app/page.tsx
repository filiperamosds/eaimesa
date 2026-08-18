import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-chili">SaaS para bares</p>
            <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
              O cardápio do seu bar, no celular do cliente.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-soft">
              Uma URL sua — tipo <span className="font-medium text-ink">/bar-do-tiao</span>. Sem app para
              instalar, sem tablet sujo na mesa. Pedir com o garçom na mesa entra na sequência; o link
              público nunca abre comanda sozinho.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cadastro"
                className="rounded-full bg-chili px-6 py-3 font-medium text-white hover:bg-chili-dark"
              >
                Criar meu cardápio
              </Link>
              <Link
                href="/bar-do-tiao"
                className="rounded-full border border-ink/15 bg-card px-6 py-3 font-medium hover:border-ink/30"
              >
                Ver o Bar do Tião
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_20px_60px_-30px_rgba(28,18,12,0.45)]">
            <p className="text-xs uppercase tracking-widest text-ink-soft">eaimesa.com.br/bar-do-tiao</p>
            <h2 className="mt-2 font-serif text-3xl">Bar do Tião</h2>
            <div className="mt-6 space-y-4">
              {[
                ["Calabresa acebolada", "R$ 32,90"],
                ["Chopp 500 ml", "R$ 14,00"],
                ["Caipirinha", "R$ 22,00"],
              ].map(([name, price]) => (
                <div key={name} className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                  <span>{name}</span>
                  <span className="font-medium tabular-nums">{price}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-paper-2">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:grid-cols-3">
            {[
              {
                t: "1. Cadastre o bar",
                d: "E-mail, senha e um slug. Em minutos você tem /seu-bar no ar.",
              },
              {
                t: "2. Monte o cardápio",
                d: "Categorias, itens, preço no servidor. O cliente não inventa valor.",
              },
              {
                t: "3. Divulgue o link",
                d: "QR na porta, Instagram, WhatsApp. Só leitura — ninguém pede de casa.",
              },
            ].map((s) => (
              <div key={s.t}>
                <h3 className="font-serif text-2xl">{s.t}</h3>
                <p className="mt-2 text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-serif text-3xl">Feito para o bar de 10 mesas</h2>
          <p className="mt-3 max-w-xl text-ink-soft">
            Plano Bar: R$ 149/mês, até 15 mesas, pedidos ilimitados quando a comanda entrar. Sem
            comissão sobre o consumo.
          </p>
          <Link href="/preco" className="mt-6 inline-block font-medium text-chili hover:text-chili-dark">
            Ver tabela de preço →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
