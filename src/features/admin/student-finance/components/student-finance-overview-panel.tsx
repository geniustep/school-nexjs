'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import type { StudentFinancePanelProps } from './student-finance-panel-props';
import {
  resolveBillingPartyLabel,
  resolveStudentFinanceOverviewMetrics,
} from '../utils/resolve-student-finance-overview';

function installmentStatusKey(state: string | null | undefined): string | null {
  if (!state) return null;
  const map: Record<string, string> = {
    upcoming: 'admin.student360.financeWorkspace.schedule.status.upcoming',
    due: 'admin.student360.financeWorkspace.schedule.status.due',
    partially_paid: 'admin.student360.financeWorkspace.schedule.status.partiallyPaid',
    paid: 'admin.student360.financeWorkspace.schedule.status.paid',
    overdue: 'admin.student360.financeWorkspace.schedule.status.overdue',
    cancelled: 'admin.student360.financeWorkspace.schedule.status.cancelled',
    pending_cheque: 'admin.student360.financeWorkspace.schedule.status.pendingChequeCoverage',
  };
  return map[state] ?? null;
}

function statusTone(state: string | null | undefined): string {
  if (!state) return 'neutral';
  if (state === 'overdue') return 'danger';
  if (state === 'paid') return 'ok';
  if (state === 'pending_cheque') return 'warn';
  if (state === 'due' || state === 'partially_paid') return 'warn';
  return 'neutral';
}

export function StudentFinanceOverviewPanel({
  studentId,
  financialOverview,
  financialOverviewLoading,
  financialOverviewError,
  onReloadFinancialOverview,
  canCollect,
  onOpenCollection,
}: StudentFinancePanelProps) {
  const t = useT();
  const { formatDate } = useFormat();

  const metrics = useMemo(
    () => resolveStudentFinanceOverviewMetrics(financialOverview),
    [financialOverview],
  );

  const billingLabel = resolveBillingPartyLabel({
    billingProfile: financialOverview?.billing_profile,
    billingPartyType: financialOverview?.billing_profile?.billing_party_type,
    t,
  });

  const chequeSummary = financialOverview?.cheque_summary;
  const showChequeSummary =
    chequeSummary != null &&
    (chequeSummary.pending_count > 0 ||
      chequeSummary.settled_count > 0 ||
      chequeSummary.rejected_count > 0);

  if (financialOverviewLoading && !metrics) {
    return <StudentSectionSkeleton rows={3} />;
  }

  if (financialOverviewError) {
    return (
      <div className="student-finance-summary-error" role="alert">
        <p>{t('admin.student360.financeOps.summaryLoadError')}</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReloadFinancialOverview}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const nextInstallment = financialOverview?.next_installment;
  const nextStatusKey = installmentStatusKey(metrics?.next_installment_state);
  const nextTitle = metrics?.next_installment_display_label;
  const nextTone = statusTone(metrics?.next_installment_state);

  return (
    <div className="student-finance-overview">
      <div className="student-finance-bento">
        {nextInstallment ? (
          <article className="student-finance-bento__card student-finance-bento__card--featured">
            <header className="student-finance-bento__card-head">
              <div>
                <span className="student-finance-bento__eyebrow">
                  {t('admin.student360.financeWorkspace.metrics.nextInstallment')}
                </span>
                <h4 className="student-finance-bento__title" dir="auto">
                  {nextTitle ?? t('common.dash')}
                </h4>
              </div>
              <span className={`student-finance-status-pill student-finance-status-pill--${nextTone}`}>
                {nextStatusKey ? t(nextStatusKey) : metrics?.next_installment_state ?? t('common.dash')}
              </span>
            </header>
            <dl className="student-finance-bento__facts">
              {metrics?.next_installment_period ? (
                <div>
                  <dt>{t('admin.student360.financeWorkspace.schedule.columns.period')}</dt>
                  <dd dir="auto">{metrics.next_installment_period}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('admin.student360.financeWorkspace.metrics.nextInstallmentAmount')}</dt>
                <dd className="student-finance-bento__amount">
                  <FinanceMoney amount={nextInstallment.amount} currency={metrics?.currency ?? undefined} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.student360.financeWorkspace.schedule.columns.dueDate')}</dt>
                <dd>
                  {metrics?.next_installment_date ? formatDate(metrics.next_installment_date) : t('common.dash')}
                </dd>
              </div>
            </dl>
            <div className="student-finance-bento__card-actions">
              <Link
                href={`/admin/students/${studentId}?tab=finance&financeSubTab=schedule`}
                className="btn btn--ghost btn--sm"
              >
                {t('admin.student360.financeWorkspace.openSchedule')}
              </Link>
              {canCollect ? (
                <button type="button" className="btn btn--primary btn--sm" onClick={onOpenCollection}>
                  {t('admin.student360.financeWorkspace.actions.recordPayment')}
                </button>
              ) : null}
            </div>
          </article>
        ) : null}

        {showChequeSummary && chequeSummary ? (
          <article className="student-finance-bento__card student-finance-bento__card--cheques">
            <header className="student-finance-bento__card-head">
              <span className="student-finance-bento__eyebrow">
                {t('admin.student360.financeWorkspace.metrics.chequeSummary')}
              </span>
              <Link
                href={`/admin/students/${studentId}?tab=finance&financeSubTab=cheques`}
                className="btn btn--ghost btn--sm"
              >
                {t('common.view')}
              </Link>
            </header>
            <div className="student-finance-cheque-stats">
              {chequeSummary.pending_count > 0 ? (
                <div className="student-finance-cheque-stat student-finance-cheque-stat--pending">
                  <span className="student-finance-cheque-stat__count">{chequeSummary.pending_count}</span>
                  <span className="student-finance-cheque-stat__label">
                    {t('admin.student360.financeWorkspace.metrics.pendingCheques')}
                  </span>
                  <FinanceMoney
                    amount={chequeSummary.pending_amount}
                    currency={metrics?.currency ?? undefined}
                    className="student-finance-cheque-stat__amount"
                  />
                </div>
              ) : null}
              {chequeSummary.settled_count > 0 ? (
                <div className="student-finance-cheque-stat student-finance-cheque-stat--settled">
                  <span className="student-finance-cheque-stat__count">{chequeSummary.settled_count}</span>
                  <span className="student-finance-cheque-stat__label">
                    {t('admin.student360.financeWorkspace.metrics.settledCheques')}
                  </span>
                  <FinanceMoney
                    amount={chequeSummary.settled_amount}
                    currency={metrics?.currency ?? undefined}
                    className="student-finance-cheque-stat__amount"
                  />
                </div>
              ) : null}
              {chequeSummary.rejected_count > 0 ? (
                <div className="student-finance-cheque-stat student-finance-cheque-stat--rejected">
                  <span className="student-finance-cheque-stat__count">{chequeSummary.rejected_count}</span>
                  <span className="student-finance-cheque-stat__label">
                    {t('admin.student360.financeWorkspace.metrics.rejectedCheques')}
                  </span>
                  <FinanceMoney
                    amount={chequeSummary.rejected_amount}
                    currency={metrics?.currency ?? undefined}
                    className="student-finance-cheque-stat__amount"
                  />
                </div>
              ) : null}
            </div>
          </article>
        ) : null}

        <article className="student-finance-bento__card">
          <header className="student-finance-bento__card-head">
            <span className="student-finance-bento__eyebrow">
              {t('admin.student360.financeWorkspace.billingPartyTitle')}
            </span>
          </header>
          <dl className="student-finance-bento__facts student-finance-bento__facts--stacked">
            <div>
              <dt>{t('admin.finance.billingPartner')}</dt>
              <dd dir="auto">{billingLabel}</dd>
            </div>
            {financialOverview?.billing_profile?.effective_from ? (
              <div>
                <dt>{t('admin.student360.financeWorkspace.billingEffectiveFrom')}</dt>
                <dd>{formatDate(financialOverview.billing_profile.effective_from)}</dd>
              </div>
            ) : null}
            {financialOverview?.academic_year?.name ? (
              <div>
                <dt>{t('admin.student360.finance.academicYear')}</dt>
                <dd>{financialOverview.academic_year.name}</dd>
              </div>
            ) : null}
          </dl>
        </article>

        <article className="student-finance-bento__card student-finance-bento__card--plans">
          <header className="student-finance-bento__card-head">
            <span className="student-finance-bento__eyebrow">
              {t('admin.student360.financeWorkspace.appliedPlansTitle')}
            </span>
          </header>
          {financialOverview?.applied_plans?.length ? (
            <div className="student-finance-plan-list">
              {financialOverview.applied_plans.map((plan) => (
                <div key={plan.id} className="student-finance-plan-item">
                  <div className="student-finance-plan-item__head">
                    <strong dir="auto">{plan.name}</strong>
                    <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost btn--sm">
                      {t('admin.student360.financeWorkspace.openPlan')}
                    </Link>
                  </div>
                  <div className="student-finance-plan-item__metrics">
                    <div>
                      <span>{t('admin.student360.financeWorkspace.metrics.annualTotal')}</span>
                      <FinanceMoney amount={plan.total_fees} currency={metrics?.currency ?? undefined} />
                    </div>
                    <div>
                      <span>{t('admin.student360.financeWorkspace.metrics.paidConfirmed')}</span>
                      <FinanceMoney amount={plan.paid} currency={metrics?.currency ?? undefined} />
                    </div>
                    <div>
                      <span>{t('admin.student360.financeWorkspace.metrics.remainingActual')}</span>
                      <FinanceMoney amount={plan.remaining} currency={metrics?.currency ?? undefined} />
                    </div>
                  </div>
                  <p className="student-finance-plan-item__meta tiny muted">
                    {t('admin.student360.financeWorkspace.feesCount')}: {plan.fees_count}
                    {' · '}
                    {t('admin.student360.financeWorkspace.installmentsCount')}: {plan.installments_count}
                    {plan.state ? ` · ${plan.state}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="student-finance-bento__empty">{t('admin.student360.financeWorkspace.noAppliedPlans')}</p>
          )}
        </article>
      </div>
    </div>
  );
}
