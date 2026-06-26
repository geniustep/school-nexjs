'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import {
  resolveCollectionGateBlocked,
  resolvePrepaymentBadgeKey,
} from '@/lib/finance/collection-gate';
import type { CollectionGate } from '@/types/payment-collection-preview';
import type { CollectibleItemsSummary, SpecialAgreementSummary } from '@/types/student-financial-overview';

export function CollectionPrepaymentSummaryCard({
  studentName,
  studentCode,
  agreement,
  summary,
  collectionGate,
  currency,
}: {
  studentName?: string | null;
  studentCode?: string | null;
  agreement?: SpecialAgreementSummary | null;
  summary?: CollectibleItemsSummary | null;
  collectionGate?: CollectionGate | null;
  currency?: string | null;
}) {
  const t = useT();
  const gateBlock = resolveCollectionGateBlocked(collectionGate, summary);
  const prepaymentKey = resolvePrepaymentBadgeKey(collectionGate, agreement?.state);
  const agreementLabel =
    agreement?.name?.trim() ||
    (agreement?.id ? `#${agreement.id}` : t('common.dash'));

  return (
    <section className="collection-prepayment-summary" aria-label={t('admin.finance.collectionWorkflow.prepaymentSummaryTitle')}>
      <dl className="collection-prepayment-summary__grid">
        <div>
          <dt>{t('admin.finance.collections.contextSection')}</dt>
          <dd dir="auto">
            {[studentName?.trim(), studentCode?.trim()].filter(Boolean).join(' · ') || t('common.dash')}
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionWorkflow.agreementLabel')}</dt>
          <dd dir="auto">
            {agreementLabel}
            {agreement?.state ? (
              <span className="collection-prepayment-summary__state tiny muted"> · {agreement.state}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeWorkspace.metrics.remaining')}</dt>
          <dd>
            <FinanceMoney amount={summary?.remaining} currency={currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.collectionWorkflow.prepaymentAllowedLabel')}</dt>
          <dd>
            <span
              className={`collection-prepayment-summary__badge${
                prepaymentKey === 'yes' ? ' is-yes' : ' is-muted'
              }`}
            >
              {prepaymentKey === 'yes'
                ? t('admin.finance.collectionWorkflow.prepaymentAllowedYes')
                : t('admin.finance.collectionWorkflow.prepaymentAllowedUnavailable')}
            </span>
          </dd>
        </div>
      </dl>
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
