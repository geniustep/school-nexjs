'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW } from '@/lib/permissions/finance';
import { getStudentDisplayName } from '@/lib/utils/student';
import { refName, studentFeeState } from '@/lib/utils/finance';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import type { StudentFee } from '@/types/finance';
import type { Student } from '@/types/student';
import type { ListParams } from '@/types/api';

export default function AdminFinanceStudentFeesPage() {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [yearId, setYearId] = useState('');

  const studentParams: ListParams = {
    page: 1,
    page_size: 10,
    search: studentQuery || undefined,
  };
  const studentsState = useAdminResource<Student[]>(
    selectedStudent ? null : endpoints.admin.students,
    studentParams,
  );
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(
    selectedStudent?.class?.id ?? null,
  );

  const feeParams: ListParams = {
    page,
    page_size: 20,
    status: statusFilter || undefined,
    overdue_only: overdueOnly ? 1 : undefined,
    academic_year_id: yearId || undefined,
  };
  const feesState = useAdminResource<StudentFee[]>(
    selectedStudent ? endpoints.admin.financeStudentFeesForStudent(selectedStudent.id) : null,
    feeParams,
  );
  const pg = feesState.meta?.pagination;

  const columns: Column<StudentFee>[] = useMemo(
    () => [
      {
        key: 'plan',
        header: t('admin.finance.planOrFeeType'),
        render: (row) => refName(row.fee_plan) ?? refName(row.fee_type) ?? t('common.dash'),
      },
      {
        key: 'year',
        header: t('admin.finance.academicYear'),
        render: (row) => refName(row.academic_year) ?? t('common.dash'),
      },
      {
        key: 'original',
        header: t('admin.finance.originalAmount'),
        render: (row) => <FinanceMoney amount={row.original_amount ?? row.amount} currency={row.currency} />,
      },
      {
        key: 'discount',
        header: t('admin.finance.discountAmount'),
        render: (row) => <FinanceMoney amount={row.discount_amount} currency={row.currency} />,
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
        render: (row) => (
          <FinanceMoney amount={row.remaining_amount ?? row.balance} currency={row.currency} />
        ),
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
    ],
    [t, formatDate],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader title={t('admin.finance.studentFeesTitle')} subtitle={t('admin.finance.studentFeesDesc')} />

      <div className="card form-stack">
        <p className="muted">{t('admin.finance.studentFeesListNote')}</p>
        {!selectedStudent ? (
          <>
            <form
              className="toolbar"
              onSubmit={(e) => {
                e.preventDefault();
                setStudentQuery(studentSearch.trim());
              }}
            >
              <input
                className="input"
                placeholder={t('admin.finance.searchStudent')}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <button type="submit" className="btn btn--ghost btn--sm">
                {t('admin.search')}
              </button>
            </form>
            <ResourceView
              state={studentsState}
              loadingLabel={t('common.loading')}
              empty={<EmptyState title={t('admin.finance.pickStudentTitle')} description={t('admin.finance.pickStudentDesc')} />}
            >
              {(students) => (
                <ul className="finance-student-pick-list">
                  {students.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="btn btn--ghost" onClick={() => setSelectedStudent(s)}>
                        {getStudentDisplayName(s)}
                        {s.class?.name ? ` · ${s.class.name}` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ResourceView>
          </>
        ) : (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Link href={`/admin/finance/students/${selectedStudent.id}`} className="btn btn--primary btn--sm">
              {t('admin.finance.openFinanceProfile')}
            </Link>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedStudent(null)}>
              {t('admin.finance.changeStudent')}
            </button>
          </div>
        )}
      </div>

      {selectedStudent && (
        <>
          <div className="toolbar">
            <select
              className="input"
              value={yearId}
              onChange={(e) => {
                setYearId(e.target.value);
                setPage(1);
              }}
              disabled={yearsLoading}
            >
              <option value="">{t('admin.finance.allAcademicYears')}</option>
              {yearOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('common.allStatuses')}</option>
              <option value="open">{t('admin.finance.states.open')}</option>
              <option value="partial">{t('admin.finance.states.partial')}</option>
              <option value="paid">{t('admin.finance.states.paid')}</option>
              <option value="overdue">{t('admin.finance.states.overdue')}</option>
            </select>
            <label className="row" style={{ gap: 6 }}>
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => {
                  setOverdueOnly(e.target.checked);
                  setPage(1);
                }}
              />
              {t('admin.finance.overdueOnly')}
            </label>
          </div>

          <ResourceView
            state={feesState}
            loadingLabel={t('common.loading')}
            empty={<EmptyState title={t('admin.finance.noStudentFees')} />}
          >
            {(rows) => (
              <>
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => router.push(`/admin/finance/student-fees/${row.id}`)}
                />
                {pg && <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />}
              </>
            )}
          </ResourceView>
        </>
      )}
    </RequireAdminPermission>
  );
}
