import Link from "next/link";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";

export const metadata = { title: "Preço" };

export default function PrecoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader solid />
      <main className="mx-auto max-w-5xl flex-1 px-5 py-16">
        <p className="eyebrow">Preço</p>
        <h1 className="mt-3 font-serif text-4xl">Dois planos agora. Equipamento depois.</h1>
        <p className="mt-3 text-ink-soft">
          Mensalidade fixa, sem comissão. Trial de 7 dias; a cobrança entra depois. Checkout desta fatia
          só confirma sucesso, sem gateway.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="surface p-8">
            <p className="font-serif text-2xl">Cardápio</p>
            <p className="mt-3 font-serif text-5xl">
              R$ 49<span className="text-2xl text-ink-soft">/mês</span>
            </p>
            <ul className="mt-6 space-y-2 text-ink-soft">
              <li>URL pública e QR do cardápio</li>
              <li>CRUD de categorias e itens</li>
              <li>Sem pedido, mesa ou garçom</li>
            </ul>
            <Link href="/cadastro?plano=cardapio" className="btn-primary mt-8">
              Adquirir Cardápio
            </Link>
          </div>
          <div className="surface p-8">
            <p className="font-serif text-2xl">Auto atendimento</p>
            <p className="mt-3 font-serif text-5xl">
              R$ 149<span className="text-2xl text-ink-soft">/mês</span>
            </p>
            <ul className="mt-6 space-y-2 text-ink-soft">
              <li>Tudo do Cardápio</li>
              <li>Até 15 mesas e 5 garçons</li>
              <li>Pedido no celular, parcial e Kanban</li>
            </ul>
            <Link href="/cadastro?plano=auto_atendimento" className="btn-primary mt-8">
              Adquirir Auto atendimento
            </Link>
          </div>
        </div>
        <p className="mt-8 text-sm text-ink-soft">
          Equipamento na mesa: em breve, sem venda nesta fatia. Subir de Cardápio para Auto atendimento
          pode a qualquer momento. Descer só depois do fim da vigência paga.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
