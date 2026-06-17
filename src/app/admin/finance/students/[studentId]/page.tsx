'use client';

import { use, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceBillingProfileForm } from '@/features/admin/finance/billing-profile-form';
import { FinanceAssignFeeForm } from '@/features/admin/finance/assign-fee-form';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChequePaymentMarker } from '@/features/admin/finance/cheque-payment-marker';
import {
  getStudentFeeLabel,
  getStudentFeeNetAmount,
  getStudentFeePaidAmount,
  getStudentFeeRemainingAmount,
  getStudentFeeCurrency,
  resolveFinanceStudentBackLabel,
  resolveFinanceStudentDisplay,
  resolveFinanceStudentSummary,
} from '@/features/admin/finance/finance-student-profile-utils';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  FINANCE_VIEW,
  canAssignFees,
  canManageBillingProfile,
  canViewBillingProfile,
} from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import { studentFeeState } from '@/lib/utils/finance';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { StudentFinanceProfile, StudentFee } from '@/types/finance';
import type { Student } from '@/types/student';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/finance-ui.css';

function financeStudentFallback(studentId: string, fees: StudentFee[]): Student {
  const fromFees = resolveFinanceStudentDisplay(fees);
  return {
    id: Number(studentId),
    name: fromFees.name ?? undefined,
    code: fromFees.code,
    level: null,
    class: null,
    status: 'active',
    gender: null,
    date_of_birth: null,
    admission_date: null,
    email: null,
    phone: null,
  };
}

function isStudentRecordBlocked(code: string | undefined): boolean {
  return code === 'forbidden' || code === 'not_found';
}

export default function AdminFinanceStudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/student-fees');
  const { formatDate } = useFormat();
  const [feesPage, setFeesPage] = useState(1);
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);

  const studentState = useAdminResource<Student>(endpoints.admin.student(studentId));
  const billingState = useAdminResource<StudentFinanceProfile>(
    canViewBillingProfile(user) ? endpoints.admin.financeBillingProfile(studentId) : null,
  );
  const feesParams: ListParams = { page: feesPage, page_size: 20 };
  const feesState = useAdminResource<StudentFee[]>(
    endpoints.admin.financeStudentFeesForStudent(studentId),
    feesParams,
  );
  const summaryFeesState = useAdminResource<StudentFee[]>(
    endpoints.admin.financeStudentFeesForStudent(studentId),
    { page: 1, page_size: 500 },
  );
  const feesPg = feesState.meta?.pagination;

  const fees = feesState.data ?? [];
  const feesForSummary = summaryFeesState.data ?? fees;
  const profileMissing = billingState.error?.code === 'not_found';
  const studentRecordBlocked = isStudentRecordBlocked(studentState.error?.code);
  const financeFeesReady =
    studentRecordBlocked && !feesState.loading && feesState.data !== null && !feesState.error;
  const student: Student | null =
    studentState.data ??
    (financeFeesReady ? financeStudentFallback(studentId, fees) : null);

  const summary = useMemo(
    () => resolveFinanceStudentSummary(billingState.data, feesForSummary),
    [billingState.data, feesForSummary],
  );

  const feeColumns: Column<StudentFee>[] = useMemo(
    () => [
      {
        key: 'plan',
        header: t('admin.finance.planOrFeeType'),
        render: (row) => {
          const label = getStudentFeeLabel(row);
          return label ? <span dir="auto">{label}</span> : t('admin.finance.unavailable');
        },
      },
      {
        key: 'original',
        header: t('admin.finance.appliedTotal'),
        render: (row) => (
          <FinanceMoney amount={row.original_amount ?? row.net_amount ?? row.amount} currency={getStudentFeeCurrency(row)} />
        ),
      },
      {
        key: 'installments',
        header: t('admin.finance.feeInstallmentsBreakdown'),
        render: (row) => {
          const installments = row.installments ?? row.lines ?? [];
          if (!installments.length) {
            return (
              <FinanceMoney amount={row.original_amount ?? row.net_amount ?? row.amount} currency={getStudentFeeCurrency(row)} />
            );
          }
          const unit = installments[0]?.amount;
          return (
            <span className="tiny">
              {installments.length} ×{' '}
              <FinanceMoney amount={unit} currency={getStudentFeeCurrency(row)} />
            </span>
          );
        },
      },
      {
        key: 'net',
        header: t('admin.finance.netAmount'),
        render: (row) => (
          <FinanceMoney amount={getStudentFeeNetAmount(row)} currency={getStudentFeeCurrency(row)} />
        ),
      },
      {
        key: 'paid',
        header: t('admin.finance.paidAmount'),
        render: (row) => (
          <FinanceMoney amount={getStudentFeePaidAmount(row)} currency={getStudentFeeCurrency(row)} />
        ),
      },
      {
        key: 'remaining',
        header: t('admin.finance.remainingAmount'),
        render: (row) => (
          <FinanceMoney amount={getStudentFeeRemainingAmount(row)} currency={getStudentFeeCurrency(row)} />
        ),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <FinanceStatusBadge state={studentFeeState(row)} />
            {(row.cheque || row.paid_by_cheque) && <ChequePaymentMarker fee={row} />}
          </div>
        ),
      },
      {
        key: 'due',
        header: t('admin.finance.dueDate'),
        render: (row) => formatDate(row.due_date ?? row.next_due_date) || t('admin.finance.unavailable'),
      },
    ],
    [t, formatDate],
  );

  let body: ReactNode;
  if (student) {
    const displayName = getStudentDisplayName(student);
    const subtitleParts = [displayName !== '—' ? displayName : null, student.code?.trim()].filter(Boolean);

    body = (
      <>
        <header className="finance-student-profile__header">
          <div>
            <h1 className="finance-student-profile__title">{t('admin.finance.financeProfileTitle')}</h1>
            <p className="finance-student-profile__subtitle" dir="auto">
              {subtitleParts.join(' · ') || t('admin.finance.unavailable')}
            </p>
          </div>
          <div className="finance-student-profile__actions">
            {canManageBillingProfile(user) && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowBillingForm((v) => !v)}>
                {t('admin.finance.manageBillingProfile')}
              </button>
            )}
            {canAssignFees(user) && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowAssignForm((v) => !v)}>
                {t('admin.finance.assignFeePlan')}
              </button>
            )}
          </div>
        </header>

        <div className="finance-student-profile__grid">
          <section className="card finance-student-profile__section">
            <h2>{t('admin.finance.billingPartner')}</h2>
            {billingState.loading && !billingState.data && !billingState.error ? (
              <p className="muted">{t('common.loading')}</p>
            ) : profileMissing ? (
              <p className="muted">{t('admin.finance.noBillingProfileDesc')}</p>
            ) : billingState.error ? (
              <ApiErrorView error={billingState.error} onRetry={billingState.reload} />
            ) : (
              <dl className="finance-detail-fields">
                <div className="finance-detail-field">
                  <dt>{t('admin.finance.billingPartner')}</dt>
                  <dd dir="auto">{summary.payerName ?? t('admin.finance.unavailable')}</dd>
                </div>
                {student.class?.name ? (
                  <div className="finance-detail-field">
                    <dt>{t('nav.classes')}</dt>
                    <dd dir="auto">{student.class.name}</dd>
                  </div>
                ) : null}
                {student.level?.name ? (
                  <div className="finance-detail-field">
                    <dt>{t('nav.levels')}</dt>
                    <dd dir="auto">{student.level.name}</dd>
                  </div>
                ) : null}
              </dl>
            )}
          </section>

          <section className="card finance-student-profile__section">
            <h2>{t('admin.finance.summary')}</h2>
            {summaryFeesState.loading && feesForSummary.length === 0 ? (
              <p className="muted">{t('common.loading')}</p>
            ) : (
              <dl className="finance-detail-fields">
                <div className="finance-detail-field">
                  <dt>{t('admin.finance.totalAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={summary.total} currency={summary.currency} />
                  </dd>
                </div>
                <div className="finance-detail-field">
                  <dt>{t('admin.finance.paidAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={summary.paid} currency={summary.currency} />
                  </dd>
                </div>
                <div className="finance-detail-field">
                  <dt>{t('admin.finance.remainingAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={summary.remaining} currency={summary.currency} />
                  </dd>
                </div>
                {(summary.overdue ?? 0) > 0 ? (
                  <div className="finance-detail-field">
                    <dt>{t('admin.finance.overdueAmount')}</dt>
                    <dd>
                      <FinanceMoney amount={summary.overdue} currency={summary.currency} />
                    </dd>
                  </div>
                ) : null}
              </dl>
            )}
          </section>
        </div>

        {showBillingForm && canManageBillingProfile(user) && (
          <FinanceBillingProfileForm
            student={student}
            onDone={() => {
              setShowBillingForm(false);
              billingState.reload();
            }}
            onCancel={() => setShowBillingForm(false)}
          />
        )}

        {showAssignForm && canAssignFees(user) && (
          <FinanceAssignFeeForm
            studentId={Number(studentId)}
            classId={student.class?.id}
            levelId={student.level?.id}
            onDone={() => {
              setShowAssignForm(false);
              feesState.reload();
              billingState.reload();
            }}
            onCancel={() => setShowAssignForm(false)}
          />
        )}

        <section className="card finance-student-profile__section finance-student-profile__fees">
          <h2>{t('admin.finance.feesAndInstallments')}</h2>
          <ResourceView
            state={feesState}
            loadingLabel={t('common.loading')}
            empty={<EmptyState title={t('admin.finance.noStudentFees')} />}
          >
            {(rows) => (
              <>
                <DataTable
                  columns={feeColumns}
                  rows={rows}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => window.location.assign(`/admin/finance/student-fees/${row.id}`)}
                />
                {feesPg ? (
                  <Pagination
                    page={feesPg.page}
                    totalPages={feesPg.total_pages}
                    total={feesPg.total}
                    onPage={setFeesPage}
                  />
                ) : null}
              </>
            )}
          </ResourceView>
        </section>
      </>
    );
  } else if (studentState.loading || (studentRecordBlocked && feesState.loading)) {
    body = <LoadingState label={t('common.loading')} />;
  } else if (studentState.error && !studentRecordBlocked) {
    body = <ApiErrorView error={studentState.error} onRetry={studentState.reload} />;
  } else if (studentRecordBlocked && feesState.error) {
    body = <ApiErrorView error={feesState.error} onRetry={feesState.reload} />;
  } else {
    body = <ApiErrorView error={studentState.error ?? feesState.error!} onRetry={studentState.reload} />;
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <div className="finance-student-profile-page">
        <Link href={returnTo} className="back-link" prefetch={false}>
          ‹ {resolveFinanceStudentBackLabel(returnTo, t)}
        </Link>
        {body}
      </div>
    </RequireAdminPermission>
  );
}
