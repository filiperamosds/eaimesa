import { CatalogEditor } from "../../../components/catalog-editor";

export default function CardapioPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl">Cardápio</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        Categorias, itens e foto. Preço fica no servidor; o que estiver oculto não aparece na URL pública.
      </p>
      <CatalogEditor />
    </div>
  );
}
