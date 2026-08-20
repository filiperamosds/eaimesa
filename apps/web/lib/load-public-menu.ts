import { isReservedSlug, planAllowsService } from "@eaimesa/shared";
import { notFound, redirect } from "next/navigation";
import { apiBase } from "./api";
import type { PublicMenu } from "./types";

export async function loadPublicMenu(slug: string): Promise<PublicMenu | null> {
  const res = await fetch(`${apiBase()}/v1/public/venues/${encodeURIComponent(slug)}`, {
    next: { revalidate: 15 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("menu_unavailable");
  return res.json() as Promise<PublicMenu>;
}

export function venueAllowsGuestOrdering(menu: PublicMenu): boolean {
  if (!planAllowsService(menu.venue.planKind ?? menu.venue.plan ?? "")) return false;
  return Boolean(menu.venue.acceptsOrders);
}

/** PIN, claim e comanda só no Auto atendimento. Plano Cardápio volta para `/{slug}`. */
export async function requireGuestOrdering(slug: string): Promise<PublicMenu> {
  if (isReservedSlug(slug)) notFound();
  const menu = await loadPublicMenu(slug).catch(() => null);
  if (!menu) notFound();
  if (!venueAllowsGuestOrdering(menu)) redirect(`/${slug}`);
  return menu;
}
