export function formatPeriodRange(
  formatDate: (value: string | null | undefined) => string,
  start?: string | null,
  end?: string | null,
): string {
  if (!start && !end) return '—';
  if (start && end) return `${formatDate(start)} — ${formatDate(end)}`;
  return formatDate(start ?? end);
}
