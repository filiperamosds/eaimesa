import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-serif text-xl tracking-tight text-ink ${className}`}>
      Eai<span className="text-chili">Mesa</span>
    </Link>
  );
}

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header className={`border-b border-line ${solid ? "bg-card" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/preco" className="hidden text-ink-soft hover:text-ink sm:inline">
            Preço
          </Link>
          <Link href="/login" className="text-ink-soft hover:text-ink">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-chili px-4 py-2 font-medium text-white hover:bg-chili-dark"
          >
            Começar
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-2">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:justify-between">
        <p>EaiMesa · cardápio e comanda para bar pequeno</p>
        <div className="flex gap-4">
          <Link href="/preco" className="hover:text-ink">
            Preço
          </Link>
          <Link href="/termos" className="hover:text-ink">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-ink">
            Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
