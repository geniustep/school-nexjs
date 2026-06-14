'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { AgreementStateBadge } from '@/features/admin/student-finance/components/agreement-state-badge';
import { useStudentFinancialAgreements } from '@/features/admin/student-finance/hooks/use-financial-agreement';
import type { FinancialAgreement } from '@/features/admin/student-finance/types';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { refName } from '@/lib/utils/finance';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';

export function AgreementsListPanel({
  studentId,
  returnTo,
  initialState,
}: {
  studentId: number;
  returnTo?: string | null;
  initialState?: string;
}) {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const { options: yearOptions } = useAcademicYearOptions(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState(initialState ?? '');
  const [yearId, setYearId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      search: query || undefined,
      state: stateFilter || undefined,
      academic_year_id: yearId ? Number(yearId) : undefined,
      agreement_date_from: dateFrom || undefined,
      agreement_date_to: dateTo || undefined,
    }),
    [page, query, stateFilter, yearId, dateFrom, dateTo],
  );

  const state = useStudentFinancialAgreements(studentId, params);
  const pg = state.meta?.pagination;
  const safeReturn = sanitizeReturnTo(returnTo, '/admin/finance/agreements');

  const columns: Column<FinancialAgreement>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.agreements.columns.number'),
        render: (row) => (
          <span className="mono">{row.number ?? row.name ?? `#${row.id}`}</span>
        ),
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => (
          <Link
            href={buildStudentFinanceLink(row.student_id, 'financial-agreement', safeReturn)}
            onClick={(e) => e.stopPropagation()}
          >
            {refName(row.student) ?? `#${row.student_id}`}
          </Link>
        ),
      },
      {
        key: 'year',
        header: t('admin.finance.agreements.columns.academicYear'),
        render: (row) => refName(row.academic_year) ?? t('common.dash'),
      },
      {
        key: 'billing',
        header: t('admin.finance.agreements.columns.billingParty'),
        render: (row) => refName(row.billing_partner) ?? t('common.dash'),
      },
      {
        key: 'date',
        header: t('admin.finance.agreements.columns.agreementDate'),
        render: (row) => formatDate(row.agreement_date) || t('common.dash'),
      },
      {
        key: 'period',
        header: t('admin.finance.agreements.columns.period'),
        render: (row) => formatPeriodRange(formatDate, row.valid_from, row.valid_until),
      },
      {
        key: 'net',
        header: t('admin.finance.agreements.columns.netAmount'),
        render: (row) => <FinanceMoney amount={row.net_amount} currency={row.currency?.name} />,
      },
      {
        key: 'installments',
        header: t('admin.finance.agreements.columns.installmentCount'),
        render: (row) => row.schedule_summary?.installment_count ?? t('common.dash'),
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (row) => <AgreementStateBadge state={row.state} />,
      },
    ],
    [t, formatDate, safeReturn],
  );

  return (
    <>
      <form
        className="toolbar finance-hub-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          className="input"
          placeholder={t('admin.finance.agreements.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          <option value="draft">{t('admin.finance.agreements.states.draft')}</option>
          <option value="pending_approval">{t('admin.finance.agreements.states.pendingApproval')}</option>
          <option value="approved">{t('admin.finance.agreements.states.approved')}</option>
          <option value="active">{t('admin.finance.agreements.states.active')}</option>
          <option value="cancelled">{t('admin.finance.agreements.states.cancelled')}</option>
        </select>
        <select className="input" value={yearId} onChange={(e) => setYearId(e.target.value)}>
          <option value="">{t('admin.finance.allAcademicYears')}</option>
          {yearOptions.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
      </form>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        empty={
          <EmptyState
            title={t('admin.finance.agreements.emptyTitle')}
            description={t('admin.finance.agreements.emptyDesc')}
            action={
              <Link
                href={buildStudentFinanceLink(studentId, 'financial-agreement', safeReturn)}
                className="btn btn--primary btn--sm"
              >
                {t('admin.finance.agreements.openStudent360')}
              </Link>
            }
          />
        }
      >
        {(rows) => (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              onRowClick={(row) =>
                router.push(`/admin/finance/agreements/${row.id}?returnTo=${encodeURIComponent(safeReturn)}`)
              }
            />
            {pg && (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
