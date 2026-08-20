import { RegisterForm } from "../../components/auth-forms";
import { Logo } from "../../components/site-chrome";

export const metadata = { title: "Cadastrar" };

export default function CadastroPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-night p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo invert />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">Começar</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">Seu slug, no ar em minutos.</h1>
          <p className="mt-4 max-w-sm text-white/65">
            Escolha o endereço do cardápio. Depois você monta categorias, mesas e a fila do turno.
          </p>
        </div>
        <p className="text-sm text-white/40">eaimesa.com.br/seu-bar</p>
      </aside>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-5 py-12">
        <Logo className="mb-8 lg:hidden" />
        <h1 className="font-serif text-3xl">Cadastrar o bar</h1>
        <p className="mt-2 mb-8 text-ink-soft">Escolha o slug que vira a URL do cardápio.</p>
        <RegisterForm />
      </div>
    </div>
  );
}
