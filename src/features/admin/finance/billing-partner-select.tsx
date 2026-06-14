'use client';

import { useT } from '@/features/i18n/locale-context';
import { billingPartnerLabel } from './collection-form-validation';
import type { EligibleBillingPartner } from '@/types/finance';

export function BillingPartnerSelect({
  partners,
  loading,
  error,
  value,
  onChange,
  onRetry,
}: {
  partners: EligibleBillingPartner[];
  loading: boolean;
  error: string | null;
  value: string;
  onChange: (value: string) => void;
  onRetry?: () => void;
}) {
  const t = useT();

  if (loading) {
    return (
      <label>
        {t('admin.finance.billingPartner')}
        <select className="input" disabled value="">
          <option value="">{t('admin.finance.collections.loadingBillingPartners')}</option>
        </select>
      </label>
    );
  }

  if (error) {
    return (
      <div className="collection-field-state">
        <p className="form-error">{error}</p>
        {onRetry ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            {t('common.retry')}
          </button>
        ) : null}
      </div>
    );
  }

  if (!partners.length) {
    return (
      <div className="collection-field-state">
        <p className="muted">{t('admin.finance.collections.noBillingPartners')}</p>
      </div>
    );
  }

  return (
    <label>
      {t('admin.finance.billingPartner')}
      <select className="input" required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('admin.finance.selectBillingPartner')}</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {billingPartnerLabel(p)}
          </option>
        ))}
      </select>
    </label>
  );
}
