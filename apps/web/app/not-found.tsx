import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-serif text-3xl">Não encontramos isso</h1>
      <p className="mt-3 text-ink-soft">O cardápio pode ter mudado de URL ou o caminho é do produto.</p>
      <Link href="/" className="btn-primary mt-6">
        Ir para o início
      </Link>
    </div>
  );
}
