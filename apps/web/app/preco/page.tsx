import Link from "next/link";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

export const metadata = { title: "Preço" };

export default function PrecoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader solid />
      <main className="mx-auto max-w-3xl flex-1 px-5 py-16">
        <h1 className="font-serif text-4xl">Plano Bar</h1>
        <p className="mt-3 text-ink-soft">Mensalidade fixa. Sem comissão sobre o consumo.</p>
        <div className="mt-10 rounded-3xl border border-line bg-card p-8">
          <p className="font-serif text-5xl">R$ 149<span className="text-2xl text-ink-soft">/mês</span></p>
          <ul className="mt-6 space-y-2 text-ink-soft">
            <li>Até 15 mesas · 1 estabelecimento</li>
            <li>Cardápio público com URL sua</li>
            <li>Pedidos ilimitados (quando a comanda entrar)</li>
            <li>Early adopters: R$ 119/mês nos 10 primeiros, 12 meses</li>
          </ul>
          <Link
            href="/cadastro"
            className="mt-8 inline-block rounded-full bg-chili px-6 py-3 font-medium text-white hover:bg-chili-dark"
          >
            Começar no trial
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
