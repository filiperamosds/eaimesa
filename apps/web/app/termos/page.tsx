import { SiteFooter, SiteHeader } from "../../components/site-chrome";

export const metadata = { title: "Termos" };

export default function TermosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader solid />
      <main className="mx-auto max-w-2xl flex-1 px-5 py-16">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 font-serif text-4xl">Termos de uso</h1>
        <p className="mt-4 text-ink-soft">
          Texto jurídico completo entra antes do go-live. Nesta fatia o EaiMesa é um SaaS B2B: o
          estabelecimento é responsável pelo cardápio publicado; a EaiMesa opera a plataforma.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
