import { BillingPanel } from "../../../components/billing-panel";

export const metadata = { title: "Pagamento" };

export default function PagamentoPage() {
  return (
    <div>
      <p className="eyebrow">Assinatura</p>
      <h1 className="mt-2 font-serif text-3xl">Pagamento</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        Escolha o plano, veja o valor e pague com cartão ou PIX. Sem gateway: a API espera ~2s e
        devolve sucesso. Trial de 7 dias; a cobrança vale 30 dias.
      </p>
      <BillingPanel />
    </div>
  );
}
