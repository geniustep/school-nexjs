import type { StudentFinanceCurrency } from '@/types/student-finance';

export function formatFinanceCurrency(
  amount: number | null | undefined,
  currency: StudentFinanceCurrency | null | undefined,
  locale?: string,
): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  const symbol = currency?.symbol?.trim() || currency?.name?.trim() || '';
  if (!symbol) return formatted;
  if (currency?.position === 'before') return `${symbol} ${formatted}`;
  return `${formatted} ${symbol}`;
}
