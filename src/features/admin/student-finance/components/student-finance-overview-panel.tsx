'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { refName } from '@/lib/utils/finance';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import type { StudentFinancePanelProps } from './student-finance-panel-props';
import {
  resolveBillingPartyLabel,
  resolveStudentFinanceOverviewMetrics,
} from '../utils/resolve-student-finance-overview';

export function StudentFinanceOverviewPanel({
  studentId,
  effectiveYearId,
  workspace,
  officialSummary,
  officialSummaryLoading,
  officialSummaryError,
  onReloadOfficialSummary,
  installmentsSummary,
  canCollect,
  onOpenCollection,
}: StudentFinancePanelProps) {
  const t = useT();
  const { formatDate } = useFormat();

  const metrics = useMemo(
    () =>
      resolveStudentFinanceOverviewMetrics({
        officialSummary,
        workspace,
        installmentsSummary,
      }),
    [officialSummary, workspace, installmentsSummary],
  );

  const billingLabel = resolveBillingPartyLabel({
    financialResponsibleName: officialSummary?.financial_responsible?.name,
    billingPartnerName: refName(workspace?.billing_partner),
    billingPartyType: officialSummary?.billing_profile?.billing_party_type ?? workspace?.finance_profile?.billing_party_type,
    t,
  });

  const summaryItems = useMemo(() => {
    if (!metrics) return [];
    const currency = metrics.currency;
    return [
      {
        key: 'annual_total',
        label: t('admin.student360.financeWorkspace.metrics.annualTotal'),
        value: metrics.annual_total,
      },
      {
        key: 'due_to_date',
        label: t('admin.student360.financeWorkspace.metrics.dueToDate'),
        value: metrics.due_to_date,
        tone: 'amber' as const,
      },
      {
        key: 'paid',
        label: t('admin.student360.financeWorkspace.metrics.paid'),
        value: metrics.paid,
        tone: 'green' as const,
      },
      {
        key: 'remaining',
        label: t('admin.student360.financeWorkspace.metrics.remaining'),
        value: metrics.remaining,
      },
      {
        key: 'overdue',
        label: t('admin.student360.financeWorkspace.metrics.overdue'),
        value: metrics.overdue,
        tone: 'red' as const,
      },
      {
        key: 'next_installment',
        label: t('admin.student360.financeWorkspace.metrics.nextInstallment'),
        value: metrics.next_installment_amount,
        hint:
          metrics.next_installment_date != null
            ? formatDate(metrics.next_installment_date)
            : undefined,
      },
    ].map((item) => ({
      ...item,
      currency,
    }));
  }, [metrics, t, formatDate]);

  if (officialSummaryLoading && !metrics) {
    return <StudentSectionSkeleton rows={3} />;
  }

  if (officialSummaryError) {
    return (
      <div className="student-finance-summary-error" role="alert">
        <p>{t('admin.student360.financeOps.summaryLoadError')}</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReloadOfficialSummary}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="student-finance-overview">
      <Student360MetricGrid
        variant="finance"
        items={summaryItems.map((item) => ({
          key: item.key,
          label: item.label,
          value: (
            <span className="student-finance-overview__metric-value">
              <FinanceMoney amount={item.value} currency={item.currency ?? undefined} />
              {'hint' in item && item.hint ? (
                <span className="tiny muted student-finance-overview__metric-hint"> — {item.hint}</span>
              ) : null}
            </span>
          ),
          tone: 'tone' in item ? item.tone : undefined,
        }))}
      />

      <div className="student-finance-overview__cards">
        <Card className="student-finance-section">
          <Student360SectionHeader title={t('admin.student360.financeWorkspace.billingPartyTitle')} />
          <dl className="detail-list compact">
            <div>
              <dt>{t('admin.finance.billingPartner')}</dt>
              <dd dir="auto">{billingLabel}</dd>
            </div>
            {officialSummary?.billing_profile?.effective_from ? (
              <div>
                <dt>{t('admin.student360.financeWorkspace.billingEffectiveFrom')}</dt>
                <dd>{formatDate(officialSummary.billing_profile.effective_from)}</dd>
              </div>
            ) : null}
            {workspace?.finance_profile?.state ? (
              <div>
                <dt>{t('academic.status')}</dt>
                <dd>{workspace.finance_profile.state}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card className="student-finance-section">
          <Student360SectionHeader
            title={t('admin.student360.financeWorkspace.appliedPlanTitle')}
            action={
              <Link href={`/admin/finance/students/${studentId}?returnTo=${encodeURIComponent(`/admin/students/${studentId}?tab=finance&financeSubTab=fees`)}`} className="btn btn--ghost btn--sm">
                {t('admin.student360.financeWorkspace.openFees')}
              </Link>
            }
          />
          <dl className="detail-list compact">
            <div>
              <dt>{t('admin.student360.finance.academicYear')}</dt>
              <dd>{refName(workspace?.academic_year) ?? refName(officialSummary?.academic_year) ?? t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.financeWorkspace.feeCount')}</dt>
              <dd>{installmentsSummary?.total_count != null ? String(installmentsSummary.total_count) : t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.financeWorkspace.appliedTotal')}</dt>
              <dd>
                <FinanceMoney amount={metrics?.annual_total} currency={metrics?.currency ?? undefined} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.student360.financeWorkspace.specialAgreement')}</dt>
              <dd>
                {metrics?.has_special_agreement
                  ? t('admin.student360.financeWorkspace.hasSpecialAgreement')
                  : t('admin.student360.financeWorkspace.noSpecialAgreement')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="student-finance-overview__actions row">
        <Link
          href={`/admin/students/${studentId}?tab=finance&financeSubTab=schedule`}
          className="btn btn--ghost btn--sm"
        >
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
