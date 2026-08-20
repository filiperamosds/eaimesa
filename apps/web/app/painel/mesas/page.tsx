import { TablesEditor } from "../../../components/tables-editor";

export default function MesasPage() {
  return (
    <div>
      <p className="eyebrow">Salão</p>
      <h1 className="mt-2 font-serif text-3xl">Mesas</h1>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Cadastre o salão e exporte o QR fixo de cada mesa (cardápio público). O QR do garçom — que abre a
        comanda — entra na sequência; o slug continua só leitura.
      </p>
      <TablesEditor />
    </div>
  );
}
