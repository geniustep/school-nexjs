'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ApiErrorView } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { ChequeDueIndicator } from '@/features/admin/finance/cheque-due-indicator';
import { ChequeDualBadges } from '@/features/admin/student-finance/components/cheque-dual-badges';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import {
  CHEQUE_QUICK_FILTERS,
  chequeQuickFilterDescKey,
  chequeQuickFilterLabelKey,
  chequeQuickFilterTitleKey,
  isChequeQuickFilter,
  type ChequeQuickFilter,
} from '@/features/admin/finance/finance-filter-contracts';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_CHEQUES } from '@/lib/permissions/finance';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { FinanceCheque } from '@/types/finance';
import type { ListParams } from '@/types/api';

type ChequeFilters = {
  quick: string;
  search: string;
  dueFrom: string;
  dueTo: string;
  studentId: string;
  billingPartnerId: string;
  page: number;
};

const TAB_QUICKS: ChequeQuickFilter[] = CHEQUE_QUICK_FILTERS.filter((q) => q !== 'all');

function readFilters(searchParams: URLSearchParams): ChequeFilters {
  const pageRaw = searchParams.get('page');
  return {
    quick: searchParams.get('quick') ?? '',
    search: searchParams.get('search') ?? '',
    dueFrom: searchParams.get('due_date_from') ?? searchParams.get('maturity_date_from') ?? '',
    dueTo: searchParams.get('due_date_to') ?? searchParams.get('maturity_date_to') ?? '',
    studentId: searchParams.get('student_id') ?? '',
    billingPartnerId: searchParams.get('billing_partner_id') ?? '',
    page: pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1,
  };
}

export default function AdminFinanceChequesPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/cheques');
  const { formatDate } = useFormat();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const quickValid = isChequeQuickFilter(filters.quick) ? filters.quick : '';
  const invalidQuick = filters.quick && !quickValid;

  const updateFilters = useCallback(
    (updates: Partial<Record<keyof ChequeFilters, string | number | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      const map: Record<keyof ChequeFilters, string> = {
        quick: 'quick',
        search: 'search',
        dueFrom: 'due_date_from',
        dueTo: 'due_date_to',
        studentId: 'student_id',
        billingPartnerId: 'billing_partner_id',
        page: 'page',
      };
      for (const [key, value] of Object.entries(updates) as Array<[keyof ChequeFilters, string | number | null]>) {
        const paramKey = map[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) params.delete(paramKey);
        else params.set(paramKey, String(value));
      }
      params.delete('maturity_date_from');
      params.delete('maturity_date_to');
      params.delete('state');
      params.delete('overdue_only');
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/cheques?${qs}` : '/admin/finance/cheques');
    },
    [router, searchParams],
  );

  const params: ListParams = useMemo(() => {
    const p: ListParams = {
      page: filters.page,
      page_size: 20,
      search: filters.search || undefined,
      student_id: filters.studentId || undefined,
      billing_partner_id: filters.billingPartnerId || undefined,
      include_summary: quickValid ? 1 : undefined,
    };
    if (filters.dueFrom) p.maturity_date_from = filters.dueFrom;
    if (filters.dueTo) p.maturity_date_to = filters.dueTo;
    if (quickValid && quickValid !== 'all') p.quick = quickValid;
    return p;
  }, [filters, quickValid]);

  const state = useAdminResource<FinanceCheque[] | Record<string, unknown>>(endpoints.admin.financeCheques, params);
  const parsed = useMemo(() => parseFinanceQuickListResponse<FinanceCheque>(state.data), [state.data]);
  const rows = parsed.items;
  const summary = parsed.summary;
  const applied = parsed.appliedFilters;
  const pg = state.meta?.pagination;

  const listReturnTo = useMemo(() => {
    const params = new URLSearchParams();
    if (quickValid) params.set('quick', quickValid);
    const qs = params.toString();
    return `/admin/finance/cheques${qs ? `?${qs}` : ''}`;
  }, [quickValid]);

  const pageTitle =
    quickValid && chequeQuickFilterTitleKey(quickValid)
      ? t(chequeQuickFilterTitleKey(quickValid)!)
      : t('admin.finance.cheques.title');
  const pageSubtitle =
    quickValid && chequeQuickFilterDescKey(quickValid)
      ? t(chequeQuickFilterDescKey(quickValid)!)
      : t('admin.finance.cheques.subtitle');

  const columns: Column<FinanceCheque>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.cheques.chequeNumber'),
        render: (row) => <span className="mono">{row.cheque_number ?? t('common.dash')}</span>,
      },
      {
        key: 'holder',
        header: t('admin.finance.cheques.holderName'),
        render: (row) => <span dir="auto">{row.holder_name ?? t('common.dash')}</span>,
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => {
          const sid = row.student_id ?? row.student?.id;
          const label =
            row.student_name ?? financeStudentDisplayName(row.student ?? {}) ?? t('admin.finance.unavailable');
          if (!sid) return <span dir="auto">{label}</span>;
          return (
            <Link
              href={buildStudentFinanceLink(sid, 'finance', returnTo)}
              onClick={(e) => e.stopPropagation()}
              dir="auto"
            >
              {label}
            </Link>
          );
        },
      },
      {
        key: 'bank',
        header: t('admin.finance.cheques.bankName'),
        render: (row) => <span dir="auto">{row.bank_name ?? t('common.dash')}</span>,
      },
      {
        key: 'amount',
        header: t('admin.finance.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={row.currency} />,
      },
      {
        key: 'received',
        header: t('admin.finance.cheques.receivedDate'),
        render: (row) => formatDate(row.received_date) || t('common.dash'),
      },
      {
        key: 'due',
        header: t('admin.finance.cheques.dueDate'),
        render: (row) => formatDate(row.due_date) || t('common.dash'),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) => (
          <ChequeDualBadges
            lifecycleState={(row as FinanceCheque & { lifecycle_state?: string }).lifecycle_state ?? row.state ?? 'received'}
            maturityStatus={(row as FinanceCheque & { maturity_status?: string }).maturity_status}
          />
        ),
      },
      {
        key: 'dueFlag',
        header: t('admin.finance.cheques.dueStatus'),
        render: (row) => <ChequeDueIndicator cheque={row} />,
      },
    ],
    [t, formatDate, returnTo],
  );

  const hasFilters = !!(filters.search || filters.dueFrom || filters.dueTo || filters.studentId || quickValid);

  const emptyTitle = quickValid
    ? quickValid === 'due_next_7_days'
      ? t('admin.finance.cheques.emptyDueNextSevenDays')
      : t('admin.finance.cheques.emptyFilteredTitle', {
          filter: t(chequeQuickFilterLabelKey(quickValid)),
        })
    : t('admin.finance.cheques.empty');

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CHEQUES}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader title={pageTitle} subtitle={pageSubtitle} />

      {filters.billingPartnerId ? (
        <BillingPartnerScopeChip
          billingPartnerId={filters.billingPartnerId}
          onClear={() => updateFilters({ billingPartnerId: null, page: 1 })}
        />
      ) : null}

      {invalidQuick ? (
        <ApiErrorView error={{ code: 'invalid_quick_filter', message: t('admin.finance.errors.invalidQuickFilter') }} />
      ) : null}

      {quickValid ? (
        <div className="finance-cheque-active-filter">
          <span className="finance-cheque-active-filter__chip">
            {t('admin.finance.cheques.activeFilterChip', {
              filter: t(chequeQuickFilterLabelKey(quickValid)),
            })}
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => updateFilters({ quick: null, page: 1 })}>
            {t('admin.finance.cheques.clearFilter')}
          </button>
        </div>
      ) : null}

      {summary ? (
        <div className="finance-metrics-grid finance-cheque-summary-grid finance-cheque-summary-grid--balanced">
          <div className="card finance-metric-card">
            <span className="muted">{t('admin.finance.cheques.summaryTotalCount')}</span>
            <strong className="mono">{summary.total_count ?? pg?.total ?? 0}</strong>
          </div>
          {summary.total_amount != null ? (
            <div className="card finance-metric-card">
              <span className="muted">{t('admin.finance.cheques.summaryTotalAmount')}</span>
              <strong>
                <FinanceMoney amount={summary.total_amount} />
              </strong>
            </div>
          ) : null}
          {applied?.date_from && applied?.date_to ? (
            <div className="card finance-metric-card">
              <span className="muted">{t('admin.finance.cheques.summaryDateRange')}</span>
              <strong className="tiny">
                {formatDate(String(applied.date_from))} – {formatDate(String(applied.date_to))}
              </strong>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="finance-cheque-quick-filters finance-cheque-quick-filters--compact">
        <button
          type="button"
          className={`btn btn--ghost btn--sm${!quickValid ? ' is-active' : ''}`}
          onClick={() => updateFilters({ quick: null, page: 1 })}
        >
          {t('admin.finance.cheques.filters.all')}
        </button>
        {TAB_QUICKS.map((key) => (
          <button
            key={key}
            type="button"
            className={`btn btn--ghost btn--sm${quickValid === key ? ' is-active' : ''}`}
            onClick={() => updateFilters({ quick: quickValid === key ? null : key, page: 1 })}
          >
            {t(chequeQuickFilterLabelKey(key))}
          </button>
        ))}
      </div>

      <form
        className="toolbar finance-hub-filters"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          updateFilters({
            search: String(fd.get('search') ?? '').trim() || null,
            dueFrom: String(fd.get('due_date_from') ?? '') || null,
            dueTo: String(fd.get('due_date_to') ?? '') || null,
            studentId: String(fd.get('student_id') ?? '').trim() || null,
            quick: null,
            page: 1,
          });
        }}
      >
        <input
          className="input"
          name="search"
          placeholder={t('admin.finance.cheques.searchPlaceholder')}
          defaultValue={filters.search}
        />
        <input
          className="input"
          type="date"
          name="due_date_from"
          defaultValue={filters.dueFrom}
          aria-label={t('admin.finance.cheques.dueFrom')}
        />
        <input
          className="input"
          type="date"
          name="due_date_to"
          defaultValue={filters.dueTo}
          aria-label={t('admin.finance.cheques.dueTo')}
        />
        <input
          className="input"
          name="student_id"
          placeholder={t('admin.finance.cheques.studentIdFilter')}
          defaultValue={filters.studentId}
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
        {hasFilters ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() =>
              updateFilters({
                quick: null,
                search: null,
                dueFrom: null,
                dueTo: null,
                studentId: null,
                page: 1,
              })
            }
          >
            {t('admin.finance.collections.resetFilters')}
          </button>
        ) : null}
      </form>

      <ResourceView
        state={{ ...state, data: rows as FinanceCheque[] | null }}
        loadingLabel={t('common.loading')}
        empty={
          <EmptyState
            title={emptyTitle}
            description={t('admin.finance.cheques.emptyFilteredDesc')}
            action={
              hasFilters ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() =>
                    updateFilters({
                      quick: null,
                      search: null,
                      dueFrom: null,
                      dueTo: null,
                      studentId: null,
                      page: 1,
                    })
                  }
                >
                  {t('admin.finance.cheques.showAllCheques')}
                </button>
              ) : undefined
            }
          />
        }
      >
        {(list) => (
          <>
            <DataTable
              columns={columns}
              rows={list}
              rowKey={(row) => row.id}
              onRowClick={(row) =>
                router.push(appendReturnTo(`/admin/finance/cheques/${row.id}`, listReturnTo))
              }
            />
            {pg ? (
              <Pagination
                page={pg.page}
                totalPages={pg.total_pages}
                total={pg.total}
                onPage={(p) => updateFilters({ page: p })}
              />
            ) : null}
          </>
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
