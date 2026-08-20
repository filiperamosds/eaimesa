import { Suspense } from "react";
import { LoginForm } from "../../components/auth-forms";
import { Logo } from "../../components/site-chrome";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-night p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo invert />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Painel</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">A fila do bar, na tela.</h1>
          <p className="mt-4 max-w-sm text-white/65">
            Pedidos, cardápio e mesas no mesmo lugar. O cliente lê o cardápio no celular — pedir exige o
            garçom na mesa.
          </p>
        </div>
        <p className="text-sm text-white/40">EaiMesa</p>
      </aside>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-5 py-12">
        <Logo className="mb-8 lg:hidden" />
        <h1 className="font-serif text-3xl">Entrar no painel</h1>
        <p className="mt-2 mb-8 text-ink-soft">Acesso do estabelecimento.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
