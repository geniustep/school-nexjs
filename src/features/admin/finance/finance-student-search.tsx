'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { FINANCE_VIEW_STUDENT_BALANCE, canViewStudentBalance } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import { parseFinanceList, normalizePagination } from '@/lib/utils/finance-normalize';
import type { FinanceStudentSearchResult } from '@/types/finance';
import type { ListParams } from '@/types/api';

export function FinanceStudentSearch({
  onSelect,
  initialSearch = '',
  showProfileLink = true,
}: {
  onSelect?: (student: FinanceStudentSearchResult) => void;
  initialSearch?: string;
  showProfileLink?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [hasBalance, setHasBalance] = useState(false);

  const params: ListParams = {
    page,
    page_size: 20,
    search: query || undefined,
    overdue_only: overdueOnly ? 1 : undefined,
    has_balance: hasBalance ? 1 : undefined,
  };
  const state = useAdminResource<unknown>(endpoints.admin.financeStudentsSearch, params);

  const rows = useMemo(
    () => parseFinanceList<FinanceStudentSearchResult>(state.data),
    [state.data],
  );
  const pg = normalizePagination(state.meta) ?? state.meta?.pagination ?? null;
  const viewState = { ...state, data: rows };

  const columns: Column<FinanceStudentSearchResult>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('nav.students'),
        render: (row) => <strong>{financeStudentDisplayName(row)}</strong>,
      },
      {
        key: 'code',
        header: t('admin.finance.feeTypeCode'),
        render: (row) => row.code ?? t('common.dash'),
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (row) => row.class?.name ?? t('common.dash'),
      },
      {
        key: 'level',
        header: t('nav.levels'),
        render: (row) => row.level?.name ?? t('common.dash'),
      },
      {
        key: 'school',
        header: t('nav.school'),
        render: (row) => row.school?.name ?? t('common.dash'),
      },
      {
        key: 'due',
        header: t('admin.finance.totalAmount'),
        render: (row) => (
          <FinanceMoney amount={row.total_due ?? row.total_amount} currency={row.currency} />
        ),
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
        key: 'overdue',
        header: t('admin.finance.overdueAmount'),
        render: (row) => <FinanceMoney amount={row.overdue_amount} currency={row.currency} />,
      },
    ],
    [t],
  );

  function openStudent(row: FinanceStudentSearchResult) {
    if (onSelect) {
      onSelect(row);
      return;
    }
    router.push(`/admin/finance/students/${row.id}`);
  }

  return (
    <div className="form-stack">
      <div
        className="toolbar"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            setQuery(search.trim());
            setPage(1);
          }
        }}
      >
        <input
          className="input"
          placeholder={t('admin.finance.searchStudent')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setQuery(search.trim());
            setPage(1);
          }}
        >
          {t('admin.search')}
        </button>
        <label className="row" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={hasBalance}
            onChange={(e) => {
              setHasBalance(e.target.checked);
              setPage(1);
            }}
          />
          {t('admin.finance.hasBalanceOnly')}
        </label>
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
        state={viewState}
        loadingLabel={t('common.loading')}
        empty={
          <EmptyState
            title={t('admin.finance.pickStudentTitle')}
            description={t('admin.finance.pickStudentDesc')}
          />
        }
      >
        {(list) => (
          <>
            <DataTable
              columns={columns}
              rows={list}
              rowKey={(row) => row.id}
              onRowClick={openStudent}
            />
            {pg && (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            )}
            {showProfileLink && list.length === 1 && (
              <Link href={`/admin/finance/students/${list[0].id}`} className="btn btn--primary btn--sm">
                {t('admin.finance.openFinanceProfile')}
              </Link>
            )}
          </>
        )}
      </ResourceView>
    </div>
  );
}

/** Wrapper with permission gate for standalone student search pages. */
export function FinanceStudentSearchPage() {
  const t = useT();
  const user = useSession();

  if (!canViewStudentBalance(user)) {
    return (
      <RequireAdminPermission permission={FINANCE_VIEW_STUDENT_BALANCE}>
        <span />
      </RequireAdminPermission>
    );
  }

  return (
    <>
      <p className="muted">{t('admin.finance.studentFeesListNote')}</p>
      <FinanceStudentSearch />
    </>
  );
}
