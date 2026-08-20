export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits;
}

/** Máscara de digitação BR: `(11) 98888-7777` ou `(11) 3333-4444`. */
export function formatPhoneInput(raw: string): string {
  const d = normalizePhone(raw).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length < 4) return "••••";
  return `•••• ${d.slice(-4)}`;
}
