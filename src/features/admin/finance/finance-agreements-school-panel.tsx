'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Agreements list shell only (billing-partner scope).
 * Detail, amendments, and contract mutations remain outside adopted scope.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/states/states';
import { LoadingState } from '@/components/states/states';
import { ApiErrorView } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import {
  AGREEMENTS_PAGE_SIZE,
  agreementsListHasActiveQuery,
  formatAgreementListDate,
  formatAgreementListNumber,
  resolveAgreementsListEmptyVariant,
} from '@/features/admin/finance/utils/agreements-list-present';
import { AgreementStateBadge } from '@/features/admin/student-finance/components/agreement-state-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { refName } from '@/lib/utils/finance';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { FinancialAgreement } from '@/features/admin/student-finance/types';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/receivable-lists.css';
import '@/features/admin/finance/agreements-list.css';

export function FinanceAgreementsSchoolPanel({
  billingPartnerId,
  returnTo,
}: {
  billingPartnerId: string;
  returnTo?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const safeReturn = sanitizeReturnTo(returnTo, '/admin/finance/agreements');
  const dash = t('common.dash');

  const hasActiveQuery = agreementsListHasActiveQuery({ billingPartnerId });
  const emptyVariant = resolveAgreementsListEmptyVariant({ hasActiveQuery });

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: AGREEMENTS_PAGE_SIZE,
      billing_partner_id: billingPartnerId,
    }),
    [page, billingPartnerId],
  );

  const state = useGlobalAcademicYearResource<unknown>(endpoints.admin.financeAgreements, params);
  const rows = useMemo(() => parseFinanceList<FinancialAgreement>(state.data), [state.data]);
  const pg = state.meta?.pagination;
  const isRefetching = state.fetching && !state.initialLoading;

  const columns: Column<FinancialAgreement>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.agreements.columns.number'),
        render: (row) => (
          <span className="mono finance-agreements-list__number">{formatAgreementListNumber(row)}</span>
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
            <FinanceMoney amount={row.net_amount} currency={row.currency} />
          </span>
        ),
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (row) => <AgreementStateBadge state={row.state} />,
      },
    ],
    [t, formatDate, safeReturn, dash],
  );

  const emptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        title={t('admin.finance.agreements.noMatch.title')}
        description={t('admin.finance.agreements.noMatch.description')}
      />
    ) : (
      <EmptyState
        title={t('admin.finance.agreements.emptyTitle')}
        description={t('admin.finance.billingAccounts.filteredEmptyDesc')}
      />
    );

  return (
    <div className="finance-agreements-list finance-receivable-list">
      <BillingPartnerScopeChip
        billingPartnerId={billingPartnerId}
        onClear={() => {
          router.replace('/admin/finance/agreements');
        }}
      />

      {pg?.total != null ? (
        <p className="finance-receivable-list__result-count" dir="ltr">
          {t('admin.finance.agreements.resultCount', { total: pg.total })}
        </p>
      ) : null}

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.agreements.refetching')}
        </p>
      ) : null}

      {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}

      {state.initialLoading ? <LoadingState label={t('common.loading')} /> : null}

      {!state.initialLoading && !state.error && rows.length === 0 ? emptyState : null}

      {!state.initialLoading && !state.error && rows.length > 0 ? (
        <div
          className={
            isRefetching
              ? 'finance-agreements-list__table-wrap finance-receivable-list__results finance-receivable-list__results--fetching'
              : 'finance-agreements-list__table-wrap finance-receivable-list__results'
          }
        >
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) =>
              router.push(
                `/admin/finance/agreements/${row.id}?returnTo=${encodeURIComponent(safeReturn)}`,
              )
            }
          />
          {pg ? (
            <Pagination
              page={pg.page}
              pageSize={pg.page_size}
              total={pg.total}
              totalPages={pg.total_pages}
              onPage={setPage}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
