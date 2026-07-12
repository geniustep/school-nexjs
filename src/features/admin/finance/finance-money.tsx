'use client';

import { useLocale } from '@/features/i18n/locale-context';
import { formatFinanceMoney, resolveFinanceCurrency } from '@/lib/i18n/format-money';
import { cn } from '@/lib/utils/cn';

export function FinanceMoney({
  amount,
  currency,
  className,
}: {
  amount?: number | null;
  currency?: unknown;
  className?: string;
}) {
  const { locale } = useLocale();
  const resolvedCurrency = resolveFinanceCurrency(currency);

  return (
    <bdi className={cn('mono finance-amount', className)} dir="ltr">
      {formatFinanceMoney(amount, resolvedCurrency, locale)}
    </bdi>
  );
}
