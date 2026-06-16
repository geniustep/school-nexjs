/** Parse Odoo and ISO date strings reliably across browsers. */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const odooSpace = trimmed.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?)$/);
  if (odooSpace) {
    const iso = `${odooSpace[1]}T${odooSpace[2].length === 5 ? `${odooSpace[2]}:00` : odooSpace[2]}`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const parsed = new Date(trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
