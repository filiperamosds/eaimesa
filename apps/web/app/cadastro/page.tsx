import { RegisterForm } from "../../components/auth-forms";
import { Logo } from "../../components/site-chrome";

export const metadata = { title: "Cadastrar" };

export default function CadastroPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Logo className="mb-8" />
      <h1 className="font-serif text-3xl">Cadastrar o bar</h1>
      <p className="mt-2 mb-8 text-ink-soft">Escolha o slug que vira a URL do cardápio.</p>
      <RegisterForm />
    </div>
  );
}
