import { SiteFooter, SiteHeader } from "../../components/site-chrome";

export const metadata = { title: "Privacidade" };

export default function PrivacidadePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader solid />
      <main className="mx-auto max-w-2xl flex-1 px-5 py-16">
        <h1 className="font-serif text-4xl">Privacidade</h1>
        <p className="mt-4 text-ink-soft">
          Na fatia de cardápio coletamos e-mail e senha do dono. Não pedimos CPF do consumidor.
          Política LGPD completa entra com cadastro KYC e pedidos.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
