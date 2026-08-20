export const RESERVED_SLUGS = [
  "login",
  "cadastro",
  "painel",
  "app",
  "api",
  "admin",
  "termos",
  "privacidade",
  "preco",
  "pricing",
  "sobre",
  "contato",
  "health",
  "static",
  "assets",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "garcom",
  "bem-vindo",
] as const;

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN = 3;
export const SLUG_MAX = 48;

export function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug);
}
