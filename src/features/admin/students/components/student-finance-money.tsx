'use client';

import { useLocale } from '@/features/i18n/locale-context';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import type { StudentFinanceCurrency } from '@/types/student-finance';
import { cn } from '@/lib/utils/cn';

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
    <bdi className={cn('mono finance-amount', className)} dir="ltr">
      {formatFinanceCurrency(amount, currency, locale)}
    </bdi>
  );
}
