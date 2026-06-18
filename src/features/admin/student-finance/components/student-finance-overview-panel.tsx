'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
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
  };
  return map[state] ?? null;
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

  return (
    <div className="student-finance-overview">
      {financialOverview?.academic_year?.name ? (
        <p className="tiny muted student-finance-overview__year">
          {t('admin.student360.finance.academicYear')}: {financialOverview.academic_year.name}
        </p>
      ) : null}

      {metrics?.has_pending_cheque ? (
        <p className="tiny student-finance-overview__cheque-hint student-finance-card-alert" role="status">
          {t('admin.student360.financeWorkspace.executive.pendingChequeAlert')}
        </p>
      ) : null}

      {showChequeSummary && chequeSummary ? (
        <Card className="student-finance-section student-finance-overview__cheque-summary">
          <Student360SectionHeader title={t('admin.student360.financeWorkspace.metrics.chequeSummary')} />
          <ul className="student-finance-cheque-summary-list">
            {chequeSummary.pending_count > 0 ? (
              <li>
                {t('admin.student360.financeWorkspace.metrics.pendingCheques')}: {chequeSummary.pending_count}
                {' — '}
                <FinanceMoney amount={chequeSummary.pending_amount} currency={metrics?.currency ?? undefined} />
              </li>
            ) : null}
            {(metrics?.cheque_pending_allocated ?? 0) > 0 ? (
              <li className="muted tiny">
                {t('admin.student360.financeWorkspace.executive.chequePendingAllocated')}:{' '}
                <FinanceMoney amount={metrics?.cheque_pending_allocated} currency={metrics?.currency ?? undefined} />
              </li>
            ) : null}
            {(metrics?.cheque_pending_unallocated ?? 0) > 0 ? (
              <li className="muted tiny">
                {t('admin.student360.financeWorkspace.executive.chequePendingUnallocated')}:{' '}
                <FinanceMoney amount={metrics?.cheque_pending_unallocated} currency={metrics?.currency ?? undefined} />
              </li>
            ) : null}
            {chequeSummary.settled_count > 0 ? (
              <li>
                {t('admin.student360.financeWorkspace.metrics.settledCheques')}: {chequeSummary.settled_count}
                {' — '}
                <FinanceMoney amount={chequeSummary.settled_amount} currency={metrics?.currency ?? undefined} />
              </li>
            ) : null}
            {chequeSummary.rejected_count > 0 ? (
              <li>
                {t('admin.student360.financeWorkspace.metrics.rejectedCheques')}: {chequeSummary.rejected_count}
                {' — '}
                <FinanceMoney amount={chequeSummary.rejected_amount} currency={metrics?.currency ?? undefined} />
              </li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      {nextInstallment ? (
        <Card className="student-finance-section student-finance-overview__next-card">
          <Student360SectionHeader title={t('admin.student360.financeWorkspace.metrics.nextInstallment')} />
          <dl className="detail-list compact">
            <div>
              <dt>{t('admin.student360.financeWorkspace.fees.columns.name')}</dt>
              <dd dir="auto">{nextTitle ?? t('common.dash')}</dd>
            </div>
            {metrics?.next_installment_period ? (
              <div>
                <dt>{t('admin.student360.financeWorkspace.schedule.columns.period')}</dt>
                <dd dir="auto">{metrics.next_installment_period}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t('admin.student360.financeWorkspace.metrics.nextInstallmentAmount')}</dt>
              <dd><FinanceMoney amount={nextInstallment.amount} currency={metrics?.currency ?? undefined} /></dd>
            </div>
            <div>
              <dt>{t('admin.student360.financeWorkspace.schedule.columns.dueDate')}</dt>
              <dd>{metrics?.next_installment_date ? formatDate(metrics.next_installment_date) : t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('academic.status')}</dt>
              <dd>
                {nextStatusKey ? t(nextStatusKey) : metrics?.next_installment_state ?? t('common.dash')}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      <div className="student-finance-overview__cards">
        <Card className="student-finance-section">
          <Student360SectionHeader title={t('admin.student360.financeWorkspace.billingPartyTitle')} />
          <dl className="detail-list compact">
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
          </dl>
        </Card>

        <Card className="student-finance-section">
          <Student360SectionHeader title={t('admin.student360.financeWorkspace.appliedPlansTitle')} />
          {financialOverview?.applied_plans?.length ? (
            <div className="student-finance-applied-plans">
              {financialOverview.applied_plans.map((plan) => (
                <div key={plan.id} className="student-finance-applied-plan">
                  <div className="student-finance-applied-plan__head">
                    <strong dir="auto">{plan.name}</strong>
                    <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost btn--sm">
                      {t('admin.student360.financeWorkspace.openPlan')}
                    </Link>
                  </div>
                  <dl className="detail-list compact">
                    <div>
                      <dt>{t('admin.student360.finance.academicYear')}</dt>
                      <dd>{plan.academic_year?.name ?? t('common.dash')}</dd>
                    </div>
                    {plan.assigned_date ? (
                      <div>
                        <dt>{t('admin.finance.assignFlow.assignedDate')}</dt>
                        <dd>{formatDate(plan.assigned_date)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>{t('admin.student360.financeWorkspace.metrics.annualTotal')}</dt>
                      <dd><FinanceMoney amount={plan.total_fees} currency={metrics?.currency ?? undefined} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.student360.financeWorkspace.metrics.paidConfirmed')}</dt>
                      <dd><FinanceMoney amount={plan.paid} currency={metrics?.currency ?? undefined} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.student360.financeWorkspace.metrics.remainingActual')}</dt>
                      <dd><FinanceMoney amount={plan.remaining} currency={metrics?.currency ?? undefined} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.student360.financeWorkspace.feesCount')}</dt>
                      <dd>{plan.fees_count}</dd>
                    </div>
                    <div>
                      <dt>{t('admin.student360.financeWorkspace.installmentsCount')}</dt>
                      <dd>{plan.installments_count}</dd>
                    </div>
                    {plan.state ? (
                      <div>
                        <dt>{t('academic.status')}</dt>
                        <dd>{plan.state}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{t('admin.student360.financeWorkspace.noAppliedPlans')}</p>
          )}
        </Card>
      </div>

      <div className="student-finance-overview__actions row">
        <Link href={`/admin/students/${studentId}?tab=finance&financeSubTab=schedule`} className="btn btn--ghost btn--sm">
          {t('admin.student360.financeWorkspace.openSchedule')}
        </Link>
        {canCollect ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={onOpenCollection}>
            {t('admin.student360.financeWorkspace.actions.recordPayment')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
