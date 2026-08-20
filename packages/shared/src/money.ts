export const PRICE_CENTS_MAX = 10_000_000;

export function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Máscara estável para input: `R$ 1.234,56` (espaço normal, sem NBSP). */
export function formatBrlMasked(cents: number): string {
  const n = Math.max(0, Math.round(cents));
  const int = Math.floor(n / 100);
  const frac = String(n % 100).padStart(2, "0");
  return `R$ ${int.toLocaleString("pt-BR")},${frac}`;
}

export function reaisToCents(raw: string): number | null {
  let s = raw.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  const cents = Math.round(n * 100);
  if (cents > PRICE_CENTS_MAX) return PRICE_CENTS_MAX;
  return cents;
}

/** Dígitos da direita para a esquerda = centavos. `1250` → 1250 cents. */
export function parseDigitsAsCents(raw: string): number | null {
  const digits = raw.replace(/\D/g, "").slice(0, String(PRICE_CENTS_MAX).length);
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, PRICE_CENTS_MAX);
}

/** Máscara de digitação BRL com 2 casas: `1` → `R$ 0,01`, `1250` → `R$ 12,50`. */
export function formatBrlTyping(raw: string): string {
  const cents = parseDigitsAsCents(raw);
  if (cents === null) return "";
  return formatBrlMasked(cents);
}

export function shiftMoneyCents(cents: number | null, inputType: string, rawValue: string): number | null {
  if (inputType.startsWith("delete")) {
    if (cents == null || cents < 10) return null;
    return Math.floor(cents / 10);
  }
  return parseDigitsAsCents(rawValue);
}

export function centsToInput(cents: number): string {
  return formatBrlMasked(cents);
}
