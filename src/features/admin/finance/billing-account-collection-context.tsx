'use client';

import { useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { IconUsers } from '@/components/icons/admin-icons';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceCollectionForm } from '@/features/admin/finance/collection-form';
import {
  resolveBillingCollectionStudentSelection,
  resolveEffectiveSelectedStudentId,
} from '@/features/admin/finance/billing-account-collection-selection';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { normalizeBillingAccountSummary } from '@/lib/utils/normalize-billing-account';

export function BillingAccountCollectionContext({
  billingPartnerId,
  academicYearId,
  onDone,
  onCancel,
}: {
  billingPartnerId: string;
  academicYearId?: string;
  onDone: (collectionId: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const state = useAdminResource<unknown>(
    endpoints.admin.financeBillingAccountSummary(billingPartnerId),
  );
  const detail = useMemo(() => normalizeBillingAccountSummary(state.data), [state.data]);
  const selection = useMemo(
    () => resolveBillingCollectionStudentSelection(detail?.students),
    [detail?.students],
  );
  const [manualStudentId, setManualStudentId] = useState<number | null>(null);
  const selectedStudentId = resolveEffectiveSelectedStudentId(selection, manualStudentId);

  if (state.initialLoading) {
    return <LoadingState label={t('admin.finance.collections.studentSelector.loading')} />;
  }


  if (!detail) {
    return (
      <ApiErrorView
        error={{
          code: state.error?.code ?? 'unknown',
          message: t('admin.finance.collections.studentSelector.contextError'),
        }}
        onRetry={state.reload}
      />
    );
  }

  const accountName =
    detail.billing_account.display_name ??
    detail.billing_account.name ??
    `#${billingPartnerId}`;
  const studentCount = detail.summary.student_count ?? selection.students.length;
  const selectedStudent =
    selection.students.find((s) => s.student_id === selectedStudentId) ?? null;
  const canChangeStudent = selection.students.length > 1;

  return (
    <div className="finance-collection-account-context">
      <section className="card finance-collection-account-summary">
        <div className="finance-collection-account-summary__identity" dir="auto">
          <strong className="finance-collection-account-summary__name">{accountName}</strong>
          {detail.billing_account.reference ? (
            <span className="mono tiny muted">{detail.billing_account.reference}</span>
          ) : null}
        </div>
        <div className="finance-collection-account-summary__meta">
          <span className="finance-billing-hero__chip">
            <IconUsers size={14} />
            {t('admin.finance.billingAccounts.studentCountLabel', {
              count: String(studentCount),
            })}
          </span>
          {detail.summary.total_remaining != null ? (
            <span className="finance-billing-hero__chip">
              {t('admin.finance.billingAccounts.metrics.remaining')}:{' '}
              <FinanceMoney
                amount={detail.summary.total_remaining}
                currency={detail.summary.currency}
              />
            </span>
          ) : null}
        </div>
      </section>

      {selection.isEmpty ? (
        <EmptyState
          title={t('admin.finance.billingAccounts.students.emptyTitle')}
          description={t('admin.finance.billingAccounts.students.emptyDesc')}
        />
      ) : !selectedStudentId ? (
        <section className="finance-billing-section finance-collection-student-picker">
          <h3>{t('admin.finance.collections.studentSelector.title')}</h3>
          <p className="muted">{t('admin.finance.collections.studentSelector.desc')}</p>
          <ul className="finance-collection-student-picker__list">
            {selection.students.map((student) => (
              <li key={student.student_id}>
                <button
                  type="button"
                  className="card finance-collection-student-picker__option"
                  onClick={() => setManualStudentId(student.student_id)}
                >
                  <span className="finance-collection-student-picker__name" dir="auto">
                    {student.student_name ?? `#${student.student_id}`}
                  </span>
                  <span className="finance-collection-student-picker__meta tiny muted">
                    {student.student_code ? (
                      <span className="mono">{student.student_code}</span>
                    ) : null}
                    {student.class_name ? <span dir="auto">{student.class_name}</span> : null}
                  </span>
                  <span className="finance-collection-student-picker__amount">
                    <FinanceMoney
                      amount={student.total_remaining}
                      currency={student.currency ?? detail.summary.currency}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          {canChangeStudent && selectedStudent ? (
            <div className="finance-collection-student-picker__selected">
              <span dir="auto">
                <strong>{selectedStudent.student_name ?? `#${selectedStudent.student_id}`}</strong>
                {selectedStudent.student_code ? (
                  <span className="mono muted"> · {selectedStudent.student_code}</span>
                ) : null}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setManualStudentId(null)}
              >
                {t('admin.finance.changeStudent')}
              </button>
            </div>
          ) : null}
          {selectedStudent && selectedStudent.total_remaining === 0 ? (
            <EmptyState
              title={t('admin.finance.collections.studentSelector.noOpenInstallments')}
              action={
                canChangeStudent ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setManualStudentId(null)}
                  >
                    {t('admin.finance.changeStudent')}
                  </button>
                ) : undefined
              }
            />
          ) : (
            <FinanceCollectionForm
              key={selectedStudentId}
              initialStudentId={selectedStudentId}
              initialBillingPartnerId={billingPartnerId}
              initialAcademicYearId={academicYearId || undefined}
              lockStudent
              onDone={onDone}
              onCancel={onCancel}
            />
          )}
        </>
      )}
    </div>
  );
}
