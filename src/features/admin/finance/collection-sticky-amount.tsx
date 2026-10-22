'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';

/** Kept outside the scrolling panel so the collection amount remains visible while editing installments. */
export function CollectionStickyAmount({
  amount,
  currency,
}: {
  amount: number;
  currency?: string | null;
}) {
  const t = useT();
  return (
    <div className="finance-collection-sticky-amount" data-testid="collection-sticky-amount">
      <span className="finance-collection-sticky-amount__label">
        {t('admin.finance.quickPayment.amountLabel')}
      </span>
      <strong className="finance-collection-sticky-amount__value" dir="ltr">
        <FinanceMoney amount={Number.isFinite(amount) && amount > 0 ? amount : 0} currency={currency} />
      </strong>
    </div>
  );
}
