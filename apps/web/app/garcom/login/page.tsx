import { Suspense } from "react";
import { StaffLoginForm } from "../../../components/staff-auth-forms";
import { Logo } from "../../../components/site-chrome";

export const metadata = { title: "Garçom — Entrar" };

export default function GarcomLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <Logo className="mb-8" />
      <p className="eyebrow">Garçom</p>
      <h1 className="mt-2 font-serif text-3xl">Entrar</h1>
      <p className="mt-2 mb-8 text-ink-soft">Escolha a mesa e gere o QR da comanda no celular.</p>
      <Suspense>
        <StaffLoginForm />
      </Suspense>
    </div>
  );
}
