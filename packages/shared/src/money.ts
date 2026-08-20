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

/** Máscara de digitação BRL: milhar com ponto, centavos após a vírgula. */
export function formatBrlTyping(raw: string): string {
  const stripped = raw.replace(/R\$/gi, "");
  const hasComma = stripped.includes(",");
  const only = stripped.replace(/[^\d,]/g, "");
  if (!only) return "";

  const [intPart = "", ...fracParts] = only.split(",");
  let intDigits = intPart.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  let frac = fracParts.join("").replace(/\D/g, "").slice(0, 2);

  const parsed = reaisToCents(
    hasComma || fracParts.length > 0 ? `${intDigits || "0"},${frac}` : intDigits,
  );
  if (parsed != null && parsed >= PRICE_CENTS_MAX) {
    return formatBrlMasked(PRICE_CENTS_MAX);
  }

  if (!intDigits && !hasComma && fracParts.length === 0) return "";
  const grouped = Number(intDigits || "0").toLocaleString("pt-BR");
  if (hasComma || fracParts.length > 0) {
    return `R$ ${grouped},${frac}`;
  }
  return `R$ ${grouped}`;
}

export function centsToInput(cents: number): string {
  return formatBrlMasked(cents);
}
