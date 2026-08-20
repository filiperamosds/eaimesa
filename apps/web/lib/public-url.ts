/** Base pública do front (QR do cardápio). */
export function appPublicOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";
}

/** URL do cardápio público — QR fixo da mesa aponta para cá. Nunca abre comanda. */
export function publicMenuUrl(slug: string): string {
  const base = appPublicOrigin().replace(/\/$/, "");
  return `${base}/${slug}`;
}

/** URL de redeem do claim — QR do garçom. Abre comanda. */
export function claimRedeemUrl(slug: string, token: string): string {
  const base = appPublicOrigin().replace(/\/$/, "");
  return `${base}/${slug}/c/${token}`;
}
