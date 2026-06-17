/** Keep raw decimal string for form state; strip invalid characters only. */
export function parseDecimalInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`;
}

export function parseDecimalAmount(raw: string): number {
  const n = Number(parseDecimalInput(raw));
  return Number.isFinite(n) ? n : 0;
}
