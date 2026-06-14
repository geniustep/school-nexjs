'use client';

import { useT } from '@/features/i18n/locale-context';
import {
  billingPartnerDisplayLabel,
  type BillingPartnerHintKey,
  type ResolvedBillingPartner,
} from './billing-partner-resolve';

export function BillingPartnerSelect({
  partners,
  loading,
  loadFailed,
  hintKey,
  requiresUserChoice,
  value,
  onChange,
  onRetry,
}: {
  partners: ResolvedBillingPartner[];
  loading: boolean;
  loadFailed: boolean;
  hintKey: BillingPartnerHintKey | null;
  requiresUserChoice: boolean;
  value: string;
  onChange: (value: string) => void;
  onRetry?: () => void;
}) {
  const t = useT();
  const showError = loadFailed || (!loading && partners.length === 0);

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

  if (showError) {
    return (
      <div className="collection-field-state">
        <p className="form-error">{t('admin.finance.collections.billingPartnerLoadFailed')}</p>
        {onRetry ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            {t('common.retry')}
          </button>
        ) : null}
      </div>
    );
  }

  const hint =
    hintKey && hintKey !== 'choosePartner'
      ? t(`admin.finance.collections.billingPartnerHint.${hintKey}`)
      : requiresUserChoice
        ? t('admin.finance.collections.billingPartnerHint.choosePartner')
        : null;

  if (partners.length === 1) {
    const only = partners[0];
    return (
      <div className="collection-billing-partner-field">
        <label>
          {t('admin.finance.billingPartner')}
          <input className="input" readOnly value={billingPartnerDisplayLabel(only)} />
        </label>
        {hint ? <p className="tiny muted collection-billing-partner-field__hint">{hint}</p> : null}
      </div>
    );
  }

  return (
    <div className="collection-billing-partner-field">
      <label>
        {t('admin.finance.billingPartner')}
        <select
          className="input"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {requiresUserChoice || !value ? (
            <option value="">{t('admin.finance.selectBillingPartner')}</option>
          ) : null}
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {billingPartnerDisplayLabel(partner)}
            </option>
          ))}
        </select>
      </label>
      {hint ? <p className="tiny muted collection-billing-partner-field__hint">{hint}</p> : null}
    </div>
  );
}
