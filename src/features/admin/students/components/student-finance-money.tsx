'use client';

import { useLocale } from '@/features/i18n/locale-context';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import type { StudentFinanceCurrency } from '@/types/student-finance';

export function StudentFinanceMoney({
  amount,
  currency,
  className,
}: {
  amount?: number | null;
  currency?: StudentFinanceCurrency | null;
  className?: string;
}) {
  const { locale } = useLocale();
  return (
    <span className={className ?? 'mono finance-amount'} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {formatFinanceCurrency(amount, currency, locale)}
    </span>
  );
}
