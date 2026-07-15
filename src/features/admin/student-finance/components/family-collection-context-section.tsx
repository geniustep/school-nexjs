'use client';

import { useMemo } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  familyFinanceErrorMessageKey,
  familyFinanceServiceTypeLabelKey,
} from '@/lib/utils/normalize-family-finance';
import type { FamilyOpenInstallment } from '@/types/family-finance';
import { resolveFamilyNextDuePresentation } from '../utils/resolve-family-next-due-presentation';
import { useStudentFamilyCollectionContext } from '../hooks/use-student-family-finance';
import { FamilyCollectionPreviewForm } from './family-collection-preview-form';

export function FamilyCollectionContextSection({
  studentId,
  familyId,
  refreshSignal = 0,
}: {
  studentId: number;
  familyId?: number | null;
  refreshSignal?: number;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const { loading, data, error, reload } = useStudentFamilyCollectionContext(
    studentId,
    true,
    refreshSignal,
  );

  const columns: Column<FamilyOpenInstallment>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('admin.student360.familyFinance.collectionContext.columns.student'),
        render: (row) => row.student_name ?? t('common.dash'),
      },
      {
        key: 'item',
        header: t('admin.student360.familyFinance.collectionContext.columns.item'),
        render: (row) =>
          row.service_label?.trim() ||
          (row.service_type
            ? t(familyFinanceServiceTypeLabelKey(row.service_type))
            : t('common.dash')),
      },
      {
        key: 'due_date',
        header: t('admin.student360.familyFinance.collectionContext.columns.dueDate'),
        render: (row) => (row.due_date ? formatDate(row.due_date) : t('common.dash')),
      },
      {
        key: 'remaining',
        header: t('admin.student360.familyFinance.collectionContext.columns.remaining'),
        render: (row) => (
          <FinanceMoney amount={row.remaining_amount} currency={data?.currency} />
        ),
      },
      {
        key: 'overdue',
        header: t('admin.student360.familyFinance.collectionContext.columns.overdueState'),
        render: (row) =>
          row.is_overdue
            ? t('admin.student360.familyFinance.collectionContext.overdue')
            : t('admin.student360.familyFinance.collectionContext.notOverdue'),
      },
    ],
    [t, formatDate, data?.currency],
  );

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
        <Student360SectionHeader title={t('admin.student360.familyFinance.collectionContext.title')} />
        <div className="student-finance-family-error" role="alert">
          <p>{t(familyFinanceErrorMessageKey(error.code))}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
            {t('common.retry')}
          </button>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const resolvedFamilyId = familyId ?? data.family_id ?? null;
  const nextDue = resolveFamilyNextDuePresentation({
    currentStudentId: studentId,
    next_due_scope: data.next_due_scope,
    next_due_student_id: data.next_due_student_id,
    next_due_date: data.next_due_date,
    next_due_amount: data.next_due_amount,
    children: data.open_installments.map((row) => ({
      student_id: row.student_id,
      student_name: row.student_name,
    })),
  });

  let nextDueAttribution: string | null = null;
  if (nextDue.show) {
    if (nextDue.attribution === 'current_student') {
      nextDueAttribution = nextDue.attributedStudentName
        ? t('admin.student360.familyFinance.nextDue.belongsToNamed', {
            name: nextDue.attributedStudentName,
          })
        : t('admin.student360.familyFinance.nextDue.belongsToCurrent');
    } else if (nextDue.attribution === 'other_family_student') {
      nextDueAttribution = nextDue.attributedStudentName
        ? t('admin.student360.familyFinance.nextDue.belongsToNamed', {
            name: nextDue.attributedStudentName,
          })
        : t('admin.student360.familyFinance.nextDue.belongsToOther');
    } else {
      nextDueAttribution = t('admin.student360.familyFinance.nextDue.familyLevel');
    }
  }

  return (
    <>
      <Card className="student-finance-section student-finance-family-collection">
        <Student360SectionHeader
          title={t('admin.student360.familyFinance.collectionContext.title')}
          description={t('admin.student360.familyFinance.collectionContext.description')}
        />
        <Student360MetricGrid
          variant="finance"
          items={[
            {
              key: 'remaining',
              label: t('admin.student360.familyFinance.metrics.remaining'),
              value: <FinanceMoney amount={data.total_remaining} currency={data.currency} />,
            },
            {
              key: 'overdue',
              label: t('admin.student360.familyFinance.metrics.overdue'),
              value: <FinanceMoney amount={data.total_overdue} currency={data.currency} />,
              tone: data.total_overdue ? 'amber' : 'none',
            },
            {
              key: 'credit',
              label: t('admin.student360.familyFinance.metrics.creditBalance'),
              value: <FinanceMoney amount={data.credit_balance} currency={data.currency} />,
            },
          ]}
        />
        {nextDue.show ? (
          <div
            className="student-finance-family-next-due student-finance-family-next-due--collection"
            role="region"
            aria-label={t('admin.student360.familyFinance.nextDue.title')}
          >
            <h4 className="student-finance-family-next-due__title">
              {t('admin.student360.familyFinance.nextDue.title')}
            </h4>
            <p className="muted tiny">{t('admin.student360.familyFinance.nextDue.familyScopeNote')}</p>
            <dl className="detail-list student-finance-family-next-due__meta">
              <div>
                <dt>{t('admin.student360.familyFinance.nextDue.date')}</dt>
                <dd>{nextDue.nextDueDate ? formatDate(nextDue.nextDueDate) : t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.student360.familyFinance.nextDue.amount')}</dt>
                <dd>
                  {nextDue.nextDueAmount != null ? (
                    <FinanceMoney amount={nextDue.nextDueAmount} currency={data.currency} />
                  ) : (
                    t('common.dash')
                  )}
                </dd>
              </div>
              <div>
                <dt>{t('admin.student360.familyFinance.nextDue.attribution')}</dt>
                <dd dir="auto">{nextDueAttribution}</dd>
              </div>
            </dl>
          </div>
        ) : null}
        <h4 className="student-finance-family-open-installments-title">
          {t('admin.student360.familyFinance.openInstallments')}
        </h4>
        {data.open_installments.length === 0 ? (
          <p className="muted tiny">{t('admin.student360.familyFinance.collectionContext.emptyInstallments')}</p>
        ) : (
          <div className="student-finance-table-wrap">
            <DataTable
              columns={columns}
              rows={data.open_installments}
              rowKey={(row) =>
                `${row.student_id}-${row.due_date ?? 'na'}-${row.service_type ?? 'item'}`
              }
            />
          </div>
        )}
      </Card>

      {resolvedFamilyId != null ? (
        <FamilyCollectionPreviewForm
          studentId={studentId}
          familyId={resolvedFamilyId}
          currency={data.currency}
        />
      ) : null}
    </>
  );
}
