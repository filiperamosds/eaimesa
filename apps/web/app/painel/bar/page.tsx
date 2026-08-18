import { VenueSettings } from "../../../components/venue-settings";

export default function BarPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl">Meu bar</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        O slug vira a rota pública. Exemplo: /bar-do-tiao. Palavras do produto (login, painel) não podem ser usadas.
      </p>
      <VenueSettings />
    </div>
  );
}
