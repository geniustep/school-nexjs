'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';

export function BillingPartnerScopeChip({
  billingPartnerId,
  label,
  onClear,
}: {
  billingPartnerId: string;
  label?: string;
  onClear: () => void;
}) {
  const t = useT();
  return (
    <div className="finance-cheque-active-filter">
      <span className="finance-cheque-active-filter__chip">
        {t('admin.finance.billingAccounts.filteredByAccount', {
          label: label ?? `#${billingPartnerId}`,
        })}
      </span>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
        {t('admin.finance.billingAccounts.clearAccountFilter')}
      </button>
    </div>
  );
}

export function BillingPartnerScopeLink({
  billingPartnerId,
  returnTo,
}: {
  billingPartnerId: number | string;
  returnTo?: string;
}) {
  const t = useT();
  const href = returnTo
    ? `/admin/finance/billing-accounts/${billingPartnerId}?returnTo=${encodeURIComponent(returnTo)}`
    : `/admin/finance/billing-accounts/${billingPartnerId}`;
  return (
    <Link href={href} className="btn btn--ghost btn--sm">
      {t('admin.finance.billingAccounts.openAccount')}
    </Link>
  );
}
