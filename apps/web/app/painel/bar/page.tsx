import { BillingPanel } from "../../../components/billing-panel";
import { VenueSettings } from "../../../components/venue-settings";

export default function BarPage() {
  return (
    <div>
      <p className="eyebrow">Estabelecimento</p>
      <h1 className="mt-2 font-serif text-3xl">Meu bar</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        O slug vira a rota pública. Exemplo: /bar-do-tiao. Palavras do produto (login, painel) não podem ser usadas.
        Plano e pagamento ficam abaixo.
      </p>
      <VenueSettings />
      <div className="mt-10">
        <BillingPanel />
      </div>
    </div>
  );
}
