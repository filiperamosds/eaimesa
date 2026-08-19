import Link from "next/link";

export function Logo({ className = "", invert = false }: { className?: string; invert?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 tracking-tight ${invert ? "text-white" : "text-ink"} ${className}`}
    >
      <span
        className={`grid h-8 w-8 place-items-center rounded-full ${invert ? "bg-white/15 text-white" : "bg-chili text-white"}`}
        aria-hidden
      >
        <span className="font-serif text-sm leading-none">é</span>
      </span>
      <span className="font-serif text-xl">
        Eai<span className={invert ? "text-amber" : "text-chili"}>Mesa</span>
      </span>
    </Link>
  );
}

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={`sticky top-0 z-30 border-b border-line/70 backdrop-blur-xl ${
        solid ? "bg-card/90" : "bg-paper/70"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/preco" className="btn-ghost hidden sm:inline-flex">
            Preço
          </Link>
          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary !px-4 !py-2 text-sm">
            Começar
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-night text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo invert />
          <p className="mt-3 max-w-sm text-sm text-white/60">
            Cardápio e comanda para bar pequeno. O cliente usa o celular; o link da porta não abre pedido.
          </p>
        </div>
        <div className="flex gap-5 text-sm text-white/70">
          <Link href="/preco" className="hover:text-white">
            Preço
          </Link>
          <Link href="/termos" className="hover:text-white">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-white">
            Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
