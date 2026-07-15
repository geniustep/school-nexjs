'use client';

import Link from 'next/link';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import type { FinanceCurrency } from '../types';
import { AgreementStateBadge } from './agreement-state-badge';
import type { AgreementsExecutiveSummaryPresentation } from '../utils/resolve-agreements-executive-summary';

export function AgreementsExecutiveSummary({
  presentation,
  currency,
  hasBillableContext = false,
}: {
  presentation: AgreementsExecutiveSummaryPresentation;
  currency?: FinanceCurrency | null;
  hasBillableContext?: boolean;
}) {
  const t = useT();

  if (!presentation.show) return null;

  const { counts } = presentation;
  const dash = t('common.dash');

  const renderMoney = (amount: number | null) =>
    amount != null ? <FinanceMoney amount={amount} currency={currency ?? undefined} /> : <span className="muted">{dash}</span>;

  return (
    <section className="student-finance-section student-finance-exec-summary" aria-label={t('admin.student360.financeWorkspace.executiveSummary.title')}>
      <div className="student-finance-exec-summary__head">
        <div className="student-finance-exec-summary__heading">
          <p className="student-finance-exec-summary__eyebrow">
            {t('admin.student360.financeWorkspace.executiveSummary.title')}
          </p>
          <p className="student-finance-exec-summary__counts tiny muted">
            {t('admin.student360.financeWorkspace.executiveSummary.counts', {
              active: String(counts.active),
              draft: String(counts.draft),
              historical: String(counts.historical),
            })}
          </p>
        </div>
        {presentation.financeHubHref ? (
          <Link href={presentation.financeHubHref} className="btn btn--ghost btn--sm">
            {t('admin.student360.financeWorkspace.executiveSummary.openInFinanceHub')}
          </Link>
        ) : null}
      </div>

      <div className="student-finance-exec-summary__grid">
        <div className="student-finance-exec-summary__kpi">
          <span className="student-finance-exec-summary__kpi-value">
            <AgreementStateBadge
              state={presentation.state ?? 'draft'}
              financeContext
              hasBillableContext={hasBillableContext}
            />
          </span>
          <span className="student-finance-exec-summary__kpi-label">
            {t('admin.student360.financeWorkspace.executiveSummary.status')}
          </span>
        </div>

        <div className="student-finance-exec-summary__kpi">
          <span className="student-finance-exec-summary__kpi-value">{renderMoney(presentation.totalAmount)}</span>
          <span className="student-finance-exec-summary__kpi-label">
            {t('admin.student360.financeWorkspace.executiveSummary.total')}
          </span>
        </div>

        <div className="student-finance-exec-summary__kpi">
          <span className="student-finance-exec-summary__kpi-value student-finance-exec-summary__kpi-value--green">
            {renderMoney(presentation.paidAmount)}
          </span>
          <span className="student-finance-exec-summary__kpi-label">
            {t('admin.student360.financeWorkspace.executiveSummary.paid')}
          </span>
        </div>

        <div className="student-finance-exec-summary__kpi">
          <span className="student-finance-exec-summary__kpi-value student-finance-exec-summary__kpi-value--red">
            {renderMoney(presentation.remainingAmount)}
          </span>
          <span className="student-finance-exec-summary__kpi-label">
            {t('admin.student360.financeWorkspace.executiveSummary.remaining')}
          </span>
        </div>

        <div className="student-finance-exec-summary__kpi">
          <span className="student-finance-exec-summary__kpi-value">
            {presentation.installmentCount != null ? (
              <span className="mono" dir="ltr">
                {presentation.installmentCount}
              </span>
            ) : (
              <span className="muted">{dash}</span>
            )}
          </span>
          <span className="student-finance-exec-summary__kpi-label">
            {t('admin.student360.financeWorkspace.executiveSummary.currentInstallments')}
          </span>
        </div>

        <div className="student-finance-exec-summary__kpi">
          <span className="student-finance-exec-summary__kpi-value">
            {renderMoney(presentation.scheduleTotalAmount)}
          </span>
          <span className="student-finance-exec-summary__kpi-label">
            {t('admin.student360.financeWorkspace.executiveSummary.currentScheduleTotal')}
          </span>
        </div>
      </div>
    </section>
  );
}
