'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import {
  resolveCollectionGateBlocked,
  resolvePrepaymentBadgeKey,
} from '@/lib/finance/collection-gate';
import { resolveAgreementContextLabel } from '@/features/admin/finance/collection-agreement-label';
import type { CollectibleBillingContext, CollectionGate } from '@/types/payment-collection-preview';
import type { CollectibleItemsSummary, SpecialAgreementSummary } from '@/types/student-financial-overview';

export function CollectionPrepaymentSummaryCard({
  studentName,
  studentCode,
  agreement,
  billingContext,
  summary,
  collectionGate,
  currency,
  loading = false,
}: {
  studentName?: string | null;
  studentCode?: string | null;
  agreement?: SpecialAgreementSummary | null;
  billingContext?: CollectibleBillingContext | null;
  summary?: CollectibleItemsSummary | null;
  collectionGate?: CollectionGate | null;
  currency?: string | null;
  loading?: boolean;
}) {
  const t = useT();

  if (loading) {
    return (
      <section
        className="collection-prepayment-summary collection-prepayment-summary--loading"
        aria-label={t('admin.finance.collectionWorkflow.prepaymentSummaryTitle')}
        aria-busy="true"
      >
        <p className="muted" role="status">
          {t('admin.finance.collectionWorkflow.contextLoading')}
        </p>
      </section>
    );
  }

  const gateBlock = resolveCollectionGateBlocked(collectionGate, summary);
  const prepaymentKey = resolvePrepaymentBadgeKey(collectionGate, agreement?.state);
  const agreementLabelInfo = resolveAgreementContextLabel(agreement, billingContext);
  const agreementLabel =
    agreementLabelInfo.value ??
    (agreementLabelInfo.kind === 'active'
      ? t('admin.finance.collections.activeAgreement')
      : t('admin.finance.collections.noActiveAgreement'));

  return (
    <section className="collection-prepayment-summary" aria-label={t('admin.finance.collectionWorkflow.prepaymentSummaryTitle')}>
      <header className="collection-prepayment-summary__identity">
        <span className="collection-prepayment-summary__eyebrow">{t('admin.finance.collections.contextSection')}</span>
        <h3 className="collection-prepayment-summary__student" dir="auto">{studentName?.trim() || t('common.dash')}</h3>
        {studentCode?.trim() ? <p className="collection-prepayment-summary__student-code" dir="ltr">{studentCode.trim()}</p> : null}
      </header>
      <dl className="collection-prepayment-summary__grid">
        <div className="collection-prepayment-summary__stat">
          <dt>{t('admin.finance.collectionWorkflow.agreementLabel')}</dt>
          <dd dir="auto">
            {agreementLabel}
            {agreement?.state === 'active' ? (
              <span className="collection-prepayment-summary__agreement-state">{t('admin.finance.collections.activeAgreement')}</span>
            ) : null}
          </dd>
        </div>
        <div className="collection-prepayment-summary__stat collection-prepayment-summary__stat--remaining">
          <dt>{t('admin.student360.financeWorkspace.metrics.remaining')}</dt>
          <dd><FinanceMoney amount={summary?.remaining} currency={currency} /></dd>
        </div>
      </dl>
      <div className="collection-prepayment-summary__eligibility">
        <span className="collection-prepayment-summary__eligibility-label">{t('admin.finance.collectionWorkflow.prepaymentAllowedLabel')}</span>
        <span className={`collection-prepayment-summary__badge${prepaymentKey === 'yes' ? ' is-yes' : ' is-muted'}`}>
          {prepaymentKey === 'yes'
            ? t('admin.finance.collectionWorkflow.prepaymentAllowedYes')
            : t('admin.finance.collectionWorkflow.prepaymentAllowedUnavailable')}
        </span>
      </div>
      {gateBlock.blocked ? (
        <div className="collection-prepayment-summary__alert" role="alert">
          <p>
            {gateBlock.backendMessage ||
              (gateBlock.reasonKey ? t(gateBlock.reasonKey) : t('admin.finance.collectionWorkflow.errors.genericSubmit'))}
          </p>
        </div>
      ) : null}
    </section>
  );
}
