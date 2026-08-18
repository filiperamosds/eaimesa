import { Suspense } from "react";
import { LoginForm } from "../../components/auth-forms";
import { Logo } from "../../components/site-chrome";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Logo className="mb-8" />
      <h1 className="font-serif text-3xl">Entrar no painel</h1>
      <p className="mt-2 mb-8 text-ink-soft">Acesso do estabelecimento.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
