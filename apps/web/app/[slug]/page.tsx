import { isReservedSlug } from "@eaimesa/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMenuView } from "../../components/public-menu";
import { apiBase } from "../../lib/api";
import type { PublicMenu } from "../../lib/types";

async function loadMenu(slug: string): Promise<PublicMenu | null> {
  const res = await fetch(`${apiBase()}/v1/public/venues/${encodeURIComponent(slug)}`, {
    next: { revalidate: 15 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("menu_unavailable");
  return res.json() as Promise<PublicMenu>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (isReservedSlug(slug)) return { title: "Não encontrado" };
  const menu = await loadMenu(slug).catch(() => null);
  if (!menu) return { title: "Cardápio não encontrado" };
  return {
    title: menu.venue.name,
    description: `Cardápio de ${menu.venue.name}`,
  };
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (isReservedSlug(slug)) notFound();

  let menu: PublicMenu | null;
  try {
    menu = await loadMenu(slug);
  } catch {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="text-ink-soft">Cardápio temporariamente indisponível. Tente de novo em instantes.</p>
      </div>
    );
  }
  if (!menu) notFound();

  return <PublicMenuView menu={menu} />;
}
