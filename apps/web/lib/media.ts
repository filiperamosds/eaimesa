import { apiBase } from "./api";

export function mediaSrc(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith("/v1/")) return `${apiBase()}${imageUrl}`;
  return imageUrl;
}
