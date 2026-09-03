'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { AgreementStateBadge } from '@/features/admin/student-finance/components/agreement-state-badge';
import type { FinancialAgreement } from '@/features/admin/student-finance/types';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { refName } from '@/lib/utils/finance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { ListParams } from '@/types/api';
import {
  AGREEMENTS_PAGE_SIZE,
  formatAgreementListDate,
  formatAgreementListNumber,
} from '@/features/admin/finance/utils/agreements-list-present';
import '@/features/admin/finance/receivable-lists.css';
import '@/features/admin/finance/agreements-list.css';

export function AllSchoolsAgreementsPanel({ returnTo }: { returnTo?: string | null }) {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const { activeSchoolId, setActiveSchool, switching } = useAdminSession();
  const [page, setPage] = useState(1);
  const safeReturn = sanitizeReturnTo(returnTo, '/admin/finance/agreements');
  const dash = t('common.dash');

  const params: ListParams = useMemo(
    () => ({ page, page_size: AGREEMENTS_PAGE_SIZE }),
    [page],
  );
  const state = useAdminResource<unknown>(
    endpoints.admin.financeAgreementsAllSchools,
    params,
  );
  const rows = useMemo(() => parseFinanceList<FinancialAgreement>(state.data), [state.data]);
  const pagination = state.meta?.pagination;
  const isRefetching = state.fetching && !state.initialLoading;

  const openAgreement = useCallback(async (row: FinancialAgreement) => {
    const schoolId = row.school?.id ?? row.school_id;
    if (schoolId != null && schoolId !== activeSchoolId) {
      const switched = await setActiveSchool(schoolId);
      if (!switched) return;
    }
    router.push(
      `/admin/finance/agreements/${row.id}?returnTo=${encodeURIComponent(safeReturn)}`,
    );
  }, [activeSchoolId, router, safeReturn, setActiveSchool]);

  const columns: Column<FinancialAgreement>[] = useMemo(
    () => [
      {
        key: 'school',
        header: t('admin.activeSchool'),
        render: (row) => refName(row.school) ?? `#${row.school_id ?? ''}`,
      },
      {
        key: 'number',
        header: t('admin.finance.agreements.columns.number'),
        render: (row) => (
          <span className="mono finance-agreements-list__number">
            {formatAgreementListNumber(row)}
          </span>
        ),
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => refName(row.student) ?? `#${row.student_id}`,
      },
      {
        key: 'date',
        header: t('common.date'),
        render: (row) => (
          <span className="finance-agreements-list__date" dir="ltr">
            {formatAgreementListDate(row.agreement_date, formatDate, dash)}
          </span>
        ),
      },
      {
        key: 'net',
        header: t('admin.finance.netAmount'),
        render: (row) => (
          <span className="finance-agreements-list__amount">
            <FinanceMoney amount={row.net_amount} currency={row.currency?.name} />
          </span>
        ),
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (row) => <AgreementStateBadge state={row.state} />,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={switching}
            onClick={(event) => {
              event.stopPropagation();
              void openAgreement(row);
            }}
          >
            {t('common.view')}
          </button>
        ),
      },
    ],
    [dash, formatDate, openAgreement, switching, t],
  );

  return (
    <div className="finance-agreements-list finance-receivable-list">
      {pagination?.total != null ? (
        <p className="finance-receivable-list__result-count" dir="ltr">
          {t('admin.finance.agreements.resultCount', { total: pagination.total })}
        </p>
      ) : null}

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.agreements.refetching')}
        </p>
      ) : null}

      {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}
      {state.initialLoading ? <LoadingState label={t('common.loading')} /> : null}

      {!state.initialLoading && !state.error && rows.length === 0 ? (
        <EmptyState
          title={t('admin.finance.agreements.emptyTitle')}
          description={t('admin.finance.agreements.emptyDesc')}
        />
      ) : null}

      {!state.initialLoading && !state.error && rows.length > 0 ? (
        <div className="finance-agreements-list__table-wrap finance-receivable-list__results">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => void openAgreement(row)}
          />
          {pagination ? (
            <Pagination
              page={pagination.page}
              pageSize={pagination.page_size}
              total={pagination.total}
              totalPages={pagination.total_pages}
              onPage={setPage}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
