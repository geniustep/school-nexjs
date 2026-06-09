'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { ApiErrorView } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceBillingProfileForm } from '@/features/admin/finance/billing-profile-form';
import { FinanceAssignFeeForm } from '@/features/admin/finance/assign-fee-form';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
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
import { refName, studentFeeState } from '@/lib/utils/finance';
import type { StudentFinanceProfile, StudentFee } from '@/types/finance';
import type { Student } from '@/types/student';
import type { ListParams } from '@/types/api';

export default function AdminFinanceStudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const t = useT();
  const user = useSession();
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
  const feesPg = feesState.meta?.pagination;

  const profileMissing = billingState.error?.code === 'not_found';

  const feeColumns: Column<StudentFee>[] = [
    {
      key: 'plan',
      header: t('admin.finance.planOrFeeType'),
      render: (row) => refName(row.fee_plan) ?? refName(row.fee_type) ?? t('common.dash'),
    },
    {
      key: 'net',
      header: t('admin.finance.netAmount'),
      render: (row) => <FinanceMoney amount={row.net_amount ?? row.amount} currency={row.currency} />,
    },
    {
      key: 'paid',
      header: t('admin.finance.paidAmount'),
      render: (row) => <FinanceMoney amount={row.paid_amount} currency={row.currency} />,
    },
    {
      key: 'remaining',
      header: t('admin.finance.remainingAmount'),
      render: (row) => <FinanceMoney amount={row.remaining_amount ?? row.balance} currency={row.currency} />,
    },
    {
      key: 'status',
      header: t('academic.status'),
      render: (row) => <FinanceStatusBadge state={studentFeeState(row)} />,
    },
    {
      key: 'due',
      header: t('admin.finance.dueDate'),
      render: (row) => formatDate(row.due_date ?? row.next_due_date) || t('common.dash'),
    },
  ];

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance/student-fees" className="back-link">
        ‹ {t('admin.finance.backToStudentFees')}
      </Link>
      <ResourceView state={studentState} loadingLabel={t('common.loading')}>
        {(student) => (
          <>
            <PageHeader
              title={t('admin.finance.financeProfileTitle')}
              subtitle={getStudentDisplayName(student)}
              actions={
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
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
              }
            />

            <div className="detail-grid">
              <div className="card">
                <dl className="detail-list">
                  <div>
                    <dt>{t('nav.classes')}</dt>
                    <dd>{student.class?.name ?? t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('nav.levels')}</dt>
                    <dd>{student.level?.name ?? t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('nav.school')}</dt>
                    <dd>{student.school?.name ?? t('common.dash')}</dd>
                  </div>
                </dl>
              </div>
              <div className="card">
                <h3>{t('admin.finance.summary')}</h3>
                {billingState.loading && billingState.data === null && !billingState.error ? (
                  <p className="muted">{t('common.loading')}</p>
                ) : profileMissing ? (
                  <EmptyState
                    title={t('admin.finance.noBillingProfileTitle')}
                    description={t('admin.finance.noBillingProfileDesc')}
                  />
                ) : billingState.error ? (
                  <ApiErrorView error={billingState.error} onRetry={billingState.reload} />
                ) : billingState.data ? (
                  <dl className="detail-list">
                    {billingState.data.payer_name && (
                      <div>
                        <dt>{t('admin.finance.payer')}</dt>
                        <dd>{billingState.data.payer_name}</dd>
                      </div>
                    )}
                    <div>
                      <dt>{t('admin.finance.totalAmount')}</dt>
                      <dd>
                        <FinanceMoney amount={billingState.data.total_amount} currency={billingState.data.currency} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('admin.finance.paidAmount')}</dt>
                      <dd>
                        <FinanceMoney amount={billingState.data.paid_amount} currency={billingState.data.currency} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('admin.finance.remainingAmount')}</dt>
                      <dd>
                        <FinanceMoney
                          amount={billingState.data.remaining_amount ?? billingState.data.balance}
                          currency={billingState.data.currency}
                        />
                      </dd>
                    </div>
                    {(billingState.data.overdue_amount ?? 0) > 0 && (
                      <div>
                        <dt>{t('admin.finance.overdueAmount')}</dt>
                        <dd>
                          <FinanceMoney amount={billingState.data.overdue_amount} currency={billingState.data.currency} />
                        </dd>
                      </div>
                    )}
                  </dl>
                ) : null}
              </div>
            </div>

            {showBillingForm && canManageBillingProfile(user) && (
              <FinanceBillingProfileForm
                studentId={Number(studentId)}
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
                onDone={() => {
                  setShowAssignForm(false);
                  feesState.reload();
                  billingState.reload();
                }}
                onCancel={() => setShowAssignForm(false)}
              />
            )}

            <section className="card">
              <h3>{t('admin.finance.assignedFees')}</h3>
              <ResourceView state={feesState} loadingLabel={t('common.loading')} empty={<EmptyState title={t('admin.finance.noStudentFees')} />}>
                {(rows) => (
                  <>
                    <DataTable
                      columns={feeColumns}
                      rows={rows}
                      onRowClick={(row) => window.location.assign(`/admin/finance/student-fees/${row.id}`)}
                    />
                    {feesPg && (
                      <Pagination page={feesPg.page} totalPages={feesPg.total_pages} onPageChange={setFeesPage} />
                    )}
                  </>
                )}
              </ResourceView>
            </section>
          </>
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
