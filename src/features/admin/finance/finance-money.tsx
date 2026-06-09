'use client';

import { formatMoney } from '@/lib/utils/finance';

export function FinanceMoney({
  amount,
  currency,
  className,
}: {
  amount?: number | null;
  currency?: string | null;
  className?: string;
}) {
  return (
    <span className={className ?? 'mono finance-amount'} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {formatMoney(amount, currency)}
    </span>
  );
}
