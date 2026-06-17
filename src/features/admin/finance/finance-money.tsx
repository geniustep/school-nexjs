'use client';

import { useLocale } from '@/features/i18n/locale-context';
import { formatFinanceMoney, resolveFinanceCurrency } from '@/lib/i18n/format-money';

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
    <bdi
      className={className ?? 'mono finance-amount'}
      style={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}
      dir="ltr"
    >
      {formatFinanceMoney(amount, resolvedCurrency, locale)}
    </bdi>
  );
}
