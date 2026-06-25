'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { useT } from '@/features/i18n/locale-context';
import {
  familyFinanceErrorMessageKey,
  familyFinanceServiceTypeLabelKey,
  formatFamilyChildClassLevel,
} from '@/lib/utils/normalize-family-finance';
import type { ApiErrorBody } from '@/types/api';
import type { FamilyFinanceChild, FamilyFinanceSummary } from '@/types/family-finance';
import { resolveFamilyChildrenView } from '../utils/family-children-view';
import { useStudentFamilyFinanceSummary } from '../hooks/use-student-family-finance';

function FamilyFinanceSummaryMetrics({
  summary,
  currency,
}: {
  summary: FamilyFinanceSummary;
  currency?: string | null;
}) {
  const t = useT();
  const resolvedCurrency = currency ?? summary.currency;

  return (
    <Student360MetricGrid
      variant="finance"
      items={[
        {
          key: 'total_net_due',
          label: t('admin.student360.familyFinance.metrics.totalNetDue'),
          value: <FinanceMoney amount={summary.total_net_due} currency={resolvedCurrency} />,
        },
        {
          key: 'total_paid',
          label: t('admin.student360.familyFinance.metrics.totalPaid'),
          value: <FinanceMoney amount={summary.total_paid} currency={resolvedCurrency} />,
          tone: 'green',
        },
        {
          key: 'total_remaining',
          label: t('admin.student360.familyFinance.metrics.remaining'),
          value: <FinanceMoney amount={summary.total_remaining} currency={resolvedCurrency} />,
        },
        {
          key: 'total_overdue',
          label: t('admin.student360.familyFinance.metrics.overdue'),
          value: <FinanceMoney amount={summary.total_overdue} currency={resolvedCurrency} />,
          tone: summary.total_overdue ? 'amber' : 'none',
        },
        {
          key: 'credit_balance',
          label: t('admin.student360.familyFinance.metrics.creditBalance'),
          value: <FinanceMoney amount={summary.credit_balance} currency={resolvedCurrency} />,
        },
        {
          key: 'unallocated_amount',
          label: t('admin.student360.familyFinance.metrics.unallocated'),
          value: <FinanceMoney amount={summary.unallocated_amount} currency={resolvedCurrency} />,
        },
      ]}
    />
  );
}

function FamilyFinanceChildrenTable({
  children,
  currentStudentId,
  currency,
}: {
  children: FamilyFinanceChild[];
  currentStudentId: number;
  currency?: string | null;
}) {
  const t = useT();

  const columns: Column<FamilyFinanceChild>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.student360.familyFinance.children.name'),
        render: (row) => (
          <div>
            <span dir="auto">{row.student_name ?? t('common.dash')}</span>
            {row.student_id === currentStudentId ? (
              <span className="student-finance-family-current-badge tiny muted">
                {' '}
                · {t('admin.student360.familyFinance.currentStudent')}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'class',
        header: t('admin.student360.familyFinance.children.classLevel'),
        render: (row) => formatFamilyChildClassLevel(row) ?? t('common.dash'),
      },
      {
        key: 'due',
        header: t('admin.student360.familyFinance.metrics.totalNetDue'),
        render: (row) => <FinanceMoney amount={row.total_net_due} currency={currency} />,
      },
      {
        key: 'paid',
        header: t('admin.student360.familyFinance.metrics.totalPaid'),
        render: (row) => <FinanceMoney amount={row.total_paid} currency={currency} />,
      },
      {
        key: 'remaining',
        header: t('admin.student360.familyFinance.metrics.remaining'),
        render: (row) => <FinanceMoney amount={row.total_remaining} currency={currency} />,
      },
      {
        key: 'overdue',
        header: t('admin.student360.familyFinance.metrics.overdue'),
        render: (row) => <FinanceMoney amount={row.total_overdue} currency={currency} />,
      },
      {
        key: 'services',
        header: t('admin.student360.familyFinance.children.services'),
        render: (row) => {
          if (!row.services_summary.length) return t('common.dash');
          return (
            <span className="student-finance-family-services">
              {row.services_summary.map((service, index) => (
                <span key={`${row.student_id}-${service.service_type}-${index}`}>
                  {service.label?.trim() || t(familyFinanceServiceTypeLabelKey(service.service_type))}
                  {index < row.services_summary.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </span>
          );
        },
      },
    ],
    [t, currentStudentId, currency],
  );

  if (!children.length) {
    return <p className="muted tiny">{t('admin.student360.familyFinance.children.empty')}</p>;
  }

  return (
    <div className="student-finance-table-wrap">
      <DataTable columns={columns} rows={children} rowKey={(row) => row.student_id} />
    </div>
  );
}

function FamilyFinanceErrorState({
  error,
  onRetry,
}: {
  error: ApiErrorBody;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <div className="student-finance-family-error" role="alert">
      <p>{t(familyFinanceErrorMessageKey(error.code))}</p>
      {onRetry ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          {t('common.retry')}
        </button>
      ) : null}
    </div>
  );
}

export function FamilyFinanceSummarySection({
  studentId,
  refreshSignal = 0,
}: {
  studentId: number;
  refreshSignal?: number;
}) {
  const t = useT();
  const { loading, data, error, reload } = useStudentFamilyFinanceSummary(
    studentId,
    true,
    refreshSignal,
  );

  const accountName =
    data?.display_name?.trim() ||
    data?.billing_partner_name?.trim() ||
    t('common.dash');
  const familyId = data?.family_id ?? data?.billing_partner_id;

  if (loading && !data) {
    return (
      <Card className="student-finance-section">
        <StudentSectionSkeleton rows={2} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="student-finance-section">
        <Student360SectionHeader title={t('admin.student360.familyFinance.title')} />
        <FamilyFinanceErrorState error={error} onRetry={reload} />
      </Card>
    );
  }

  if (!data) return null;

  const childrenView = resolveFamilyChildrenView(data.children, studentId);

  const headerAction =
    familyId != null ? (
      <Link
        href={`/admin/finance/billing-accounts/${familyId}`}
        className="btn btn--ghost btn--sm"
      >
        {t('admin.student360.familyFinance.openBillingAccount')}
      </Link>
    ) : null;

  return (
    <Card className="student-finance-section student-finance-family-summary">
      <Student360SectionHeader
        title={t('admin.student360.familyFinance.title')}
        description={t('admin.student360.familyFinance.description')}
        action={headerAction}
      />
      <dl className="detail-list student-finance-family-meta">
        <div>
          <dt>{t('admin.student360.familyFinance.accountName')}</dt>
          <dd dir="auto">{accountName}</dd>
        </div>
        <div>
          <dt>{t('admin.student360.familyFinance.childrenCount')}</dt>
          <dd>{data.student_count ?? data.children.length}</dd>
        </div>
      </dl>
      <FamilyFinanceSummaryMetrics summary={data} currency={data.currency} />
      <h4 className="student-finance-family-children-title">
        {childrenView.hasOtherSiblings
          ? t('admin.student360.familyFinance.linkedChildrenTitle')
          : t('admin.student360.familyFinance.linkedStudentsTitle')}
      </h4>
      <FamilyFinanceChildrenTable
        children={data.children}
        currentStudentId={studentId}
        currency={data.currency}
      />
      {childrenView.showOnlyCurrentNote ? (
        <p className="muted tiny student-finance-family-no-siblings">
          {t('admin.student360.familyFinance.noOtherSiblings')}
        </p>
      ) : null}
    </Card>
  );
}
