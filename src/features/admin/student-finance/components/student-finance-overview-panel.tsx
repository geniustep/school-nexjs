'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import type { StudentFinancePanelProps } from './student-finance-panel-props';
import {
  resolveBillingPartyLabel,
  resolveStudentFinanceOverviewMetrics,
} from '../utils/resolve-student-finance-overview';
import { formatInstallmentDisplayTitle } from '../utils/format-installment-display';

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
  workspace,
  canCollect,
  onOpenCollection,
}: StudentFinancePanelProps) {
  const t = useT();
  const { locale } = useLocale();
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

  const summaryItems = useMemo(() => {
    if (!metrics) return [];
    const currency = metrics.currency;
    const pendingFromWorkspace = workspace?.summary?.pending_cheques;
    const pendingCheque = metrics.pending_cheque ?? pendingFromWorkspace ?? null;
    const paidConfirmed = metrics.paid_confirmed ?? workspace?.summary?.confirmed_paid ?? null;
    const items = [
      { key: 'annual_total', label: t('admin.student360.financeWorkspace.metrics.annualTotal'), value: metrics.annual_total },
      { key: 'due_to_date', label: t('admin.student360.financeWorkspace.metrics.dueToDate'), value: metrics.due_to_date, tone: 'amber' as const },
      { key: 'paid', label: t('admin.student360.financeWorkspace.metrics.paid'), value: metrics.paid, tone: 'green' as const },
      { key: 'remaining', label: t('admin.student360.financeWorkspace.metrics.remaining'), value: metrics.remaining },
      { key: 'overdue', label: t('admin.student360.financeWorkspace.metrics.overdue'), value: metrics.overdue, tone: 'red' as const },
      { key: 'upcoming', label: t('admin.student360.financeWorkspace.metrics.upcoming'), value: metrics.upcoming },
    ];
    if (paidConfirmed != null && paidConfirmed !== metrics.paid) {
      items.splice(3, 0, {
        key: 'paid_confirmed',
        label: t('admin.student360.financeWorkspace.metrics.paidConfirmed'),
        value: paidConfirmed,
        tone: 'green' as const,
      });
    }
    if (pendingCheque != null && pendingCheque > 0) {
      items.splice(3, 0, {
        key: 'pending_cheque',
        label: t('admin.student360.financeWorkspace.metrics.pendingCheque'),
        value: pendingCheque,
        tone: 'amber' as const,
      });
    }
    return items.map((item) => ({ ...item, currency }));
  }, [metrics, workspace?.summary, t]);

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
  const nextTitle =
    (nextInstallment
      ? formatInstallmentDisplayTitle(nextInstallment, locale)
      : metrics?.next_installment_display_label) || metrics?.next_installment_fee_name;
  const showPaidChequeHint =
    metrics?.paid_includes_pending_cheque ||
    (workspace?.summary?.pending_cheques ?? 0) > 0;

  return (
    <div className="student-finance-overview">
      {financialOverview?.academic_year?.name ? (
        <p className="tiny muted student-finance-overview__year">
          {t('admin.student360.finance.academicYear')}: {financialOverview.academic_year.name}
        </p>
      ) : null}

      <Student360MetricGrid
        variant="finance"
        items={summaryItems.map((item) => ({
          key: item.key,
          label: item.label,
          value: (
            <span className="student-finance-overview__metric-value">
              <FinanceMoney amount={item.value} currency={item.currency ?? undefined} />
            </span>
          ),
          tone: 'tone' in item ? item.tone : undefined,
        }))}
      />
      {showPaidChequeHint ? (
        <p className="tiny muted student-finance-overview__cheque-hint">
          {t('admin.student360.financeWorkspace.metrics.paidIncludesPendingCheque')}
        </p>
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
                <dd>{metrics.next_installment_period}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t('admin.student360.financeWorkspace.schedule.columns.amount')}</dt>
              <dd><FinanceMoney amount={nextInstallment.amount} currency={metrics?.currency ?? undefined} /></dd>
            </div>
            <div>
              <dt>{t('admin.student360.financeWorkspace.fees.columns.remaining')}</dt>
              <dd><FinanceMoney amount={nextInstallment.remaining_amount} currency={metrics?.currency ?? undefined} /></dd>
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
                      <dt>{t('admin.student360.financeWorkspace.metrics.paid')}</dt>
                      <dd><FinanceMoney amount={plan.paid} currency={metrics?.currency ?? undefined} /></dd>
                    </div>
                    <div>
                      <dt>{t('admin.student360.financeWorkspace.metrics.remaining')}</dt>
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
            {t('admin.finance.collectionWorkflow.recordPayment')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
