export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits;
}

export function maskPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length < 4) return "••••";
  return `•••• ${d.slice(-4)}`;
}
