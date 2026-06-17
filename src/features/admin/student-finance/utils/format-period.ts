export function formatPeriodRange(
  formatDate: (value: string | null | undefined) => string,
  start?: string | null,
  end?: string | null,
  dueDate?: string | null,
): string {
  if (start && end) return `${formatDate(start)} — ${formatDate(end)}`;
  if (start || end) return formatDate(start ?? end);
  if (dueDate) return formatDate(dueDate);
  return '—';
}
