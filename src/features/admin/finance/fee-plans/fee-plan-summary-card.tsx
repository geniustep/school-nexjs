'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import { computeFeePlanSummary } from './fee-plan-summary';
import type { DraftFeePlanLine } from './fee-plan-types';

export function FeePlanSummaryCard({
  lines,
  currency,
}: {
  lines: DraftFeePlanLine[];
  currency?: string | null;
}) {
  const t = useT();
  const summary = computeFeePlanSummary(lines, currency);

  return (
    <section className="card fee-plan-summary">
      <h4>{t('admin.finance.feePlansWorkspace.summaryTitle')}</h4>
      <dl className="detail-list compact">
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.summaryLineCount')}</dt>
          <dd>{summary.lineCount}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.summaryRequiredCount')}</dt>
          <dd>{summary.requiredCount}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.summaryOptionalCount')}</dt>
          <dd>{summary.optionalCount}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.summaryRequiredTotal')}</dt>
          <dd>
            <FinanceMoney amount={summary.requiredTotal} currency={summary.currency ?? currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.summaryOptionalTotal')}</dt>
          <dd>
            <FinanceMoney amount={summary.optionalTotal} currency={summary.currency ?? currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.summaryGrandTotal')}</dt>
          <dd>
            <strong>
              <FinanceMoney amount={summary.grandTotal} currency={summary.currency ?? currency} />
            </strong>
          </dd>
        </div>
      </dl>
      <p className="muted fee-plan-summary__note">{t('admin.finance.feePlansWorkspace.summaryNote')}</p>
    </section>
  );
}
