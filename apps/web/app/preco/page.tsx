import Link from "next/link";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

export const metadata = { title: "Preço" };

export default function PrecoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader solid />
      <main className="mx-auto max-w-3xl flex-1 px-5 py-16">
        <p className="eyebrow">Plano Bar</p>
        <h1 className="mt-3 font-serif text-4xl">Mensalidade fixa. Sem comissão.</h1>
        <p className="mt-3 text-ink-soft">Feito para o bar de ~10 mesas. O consumo não gera taxa extra.</p>
        <div className="surface mt-10 p-8">
          <p className="font-serif text-5xl">
            R$ 149<span className="text-2xl text-ink-soft">/mês</span>
          </p>
          <ul className="mt-6 space-y-2 text-ink-soft">
            <li>Até 15 mesas · 1 estabelecimento</li>
            <li>Cardápio público com URL sua</li>
            <li>Kanban de pedidos no painel</li>
            <li>Pedidos ilimitados (quando a comanda entrar)</li>
            <li>Early adopters: R$ 119/mês nos 10 primeiros, 12 meses</li>
          </ul>
          <Link href="/cadastro" className="btn-primary mt-8">
            Começar no trial
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
