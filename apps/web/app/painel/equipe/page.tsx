import { StaffEditor } from "../../../components/staff-editor";

export default function EquipePage() {
  return (
    <div>
      <p className="eyebrow">Equipe</p>
      <h1 className="mt-2 font-serif text-3xl">Garçons</h1>
      <p className="mt-2 mb-8 max-w-2xl text-ink-soft">
        Cadastre quem atende o salão. Cada garçom entra em <strong className="font-medium text-ink">/garcom</strong> no
        celular, escolhe a mesa e mostra o QR que abre a comanda para o cliente.
      </p>
      <StaffEditor />
    </div>
  );
}
