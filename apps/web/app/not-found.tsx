import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="font-serif text-3xl">Não encontramos isso</h1>
      <p className="mt-3 text-ink-soft">O cardápio pode ter mudado de URL ou o caminho é do produto.</p>
      <Link href="/" className="mt-6 rounded-full bg-chili px-5 py-2 text-white">
        Ir para o início
      </Link>
    </div>
  );
}
