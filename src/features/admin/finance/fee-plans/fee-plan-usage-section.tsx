'use client';

import { useT } from '@/features/i18n/locale-context';
import {
  feePlanIsUsed,
  feePlanUsageForDisplay,
} from '@/features/admin/finance/fee-plans/normalize-fee-plan';
import type { FeePlan, FeePlanUsage } from '@/types/finance';

type UsageMetricKey =
  | 'assigned_student_count'
  | 'student_fee_count'
  | 'agreement_count'
  | 'installment_count'
  | 'collection_count'
  | 'receipt_count';

const METRIC_KEYS: UsageMetricKey[] = [
  'assigned_student_count',
  'student_fee_count',
  'agreement_count',
  'installment_count',
  'collection_count',
  'receipt_count',
];

const METRIC_LABEL_KEYS: Record<UsageMetricKey, string> = {
  assigned_student_count: 'admin.finance.feePlansWorkspace.usageStudentsLinked',
  student_fee_count: 'admin.finance.feePlansWorkspace.usageStudentFees',
  agreement_count: 'admin.finance.feePlansWorkspace.usageAgreements',
  installment_count: 'admin.finance.feePlansWorkspace.usageInstallments',
  collection_count: 'admin.finance.feePlansWorkspace.usageCollections',
  receipt_count: 'admin.finance.feePlansWorkspace.usageReceipts',
};

function metricValue(usage: FeePlanUsage, key: UsageMetricKey): number {
  if (key === 'assigned_student_count') {
    return usage.assigned_student_count ?? usage.student_count ?? 0;
  }
  return usage[key] ?? 0;
}

export function FeePlanUsageSection({ plan }: { plan: FeePlan }) {
  const t = useT();
  const usage = feePlanUsageForDisplay(plan) ?? { is_used: false };

  const used = feePlanIsUsed(usage);
  const metrics = METRIC_KEYS.map((key) => ({
    key,
    value: metricValue(usage, key),
  })).filter((row) => row.value > 0);

  return (
    <section className="card fee-plan-detail-usage">
      <h2>{t('admin.finance.feePlansWorkspace.usageTitle')}</h2>
      {!used ? (
        <p className="fee-plan-detail-usage__empty muted">
          {t('admin.finance.feePlansWorkspace.usageNotAppliedYet')}
        </p>
      ) : (
        <>
          <p className="fee-plan-detail-usage__warning" role="status">
            {t('admin.finance.feePlansWorkspace.usageRestrictedHint')}
          </p>
          {metrics.length > 0 ? (
            <dl className="fee-plan-detail-usage__grid">
              {metrics.map(({ key, value }) => (
                <div key={key}>
                  <dt>{t(METRIC_LABEL_KEYS[key])}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      )}
    </section>
  );
}
