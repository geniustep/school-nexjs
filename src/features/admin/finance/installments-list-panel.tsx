'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import {
  INSTALLMENT_QUICK_FILTERS,
  installmentQuickFilterLabelKey,
  type InstallmentQuickFilter,
} from '@/features/admin/finance/finance-filter-contracts';
import { InstallmentStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import {
  formatInstallmentListDate,
  INSTALLMENTS_PAGE_SIZE,
  installmentQuickFilterChipLabelKey,
  installmentsListHasActiveQuery,
  resolveInstallmentQuickFilter,
  resolveInstallmentsListEmptyVariant,
} from '@/features/admin/finance/utils/installments-list-present';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import type { FinanceInstallment } from '@/types/finance';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/receivable-lists.css';

export type InstallmentsListFilters = {
  quick: string;
  search: string;
  academicYearId: string;
  classId: string;
  levelId: string;
  studentId: string;
  billingPartnerId: string;
  serviceId: string;
  dueDateFrom: string;
  dueDateTo: string;
  page: number;
};

type InstallmentsListPanelProps = {
  filters: InstallmentsListFilters;
  onFiltersChange: (updates: Partial<Record<keyof InstallmentsListFilters, string | number | null>>) => void;
  returnTo?: string;
};

const QUICK_TABS = INSTALLMENT_QUICK_FILTERS.filter((q) => q !== 'all');

export function InstallmentsListPanel({ filters, onFiltersChange, returnTo }: InstallmentsListPanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const { options: yearOptions } = useAcademicYearOptions(null);

  const quickValid = resolveInstallmentQuickFilter(filters.quick);
  const apiError = filters.quick && !quickValid && filters.quick !== '';

  const query: ListParams = useMemo(() => {
    const p: ListParams = {
      page: filters.page,
      page_size: INSTALLMENTS_PAGE_SIZE,
      search: filters.search || undefined,
      academic_year_id: filters.academicYearId || undefined,
      class_id: filters.classId || undefined,
      level_id: filters.levelId || undefined,
      student_id: filters.studentId || undefined,
      billing_partner_id: filters.billingPartnerId || undefined,
      service_id: filters.serviceId || undefined,
      due_date_from: filters.dueDateFrom || undefined,
      due_date_to: filters.dueDateTo || undefined,
    };
    if (quickValid && quickValid !== 'all') p.quick = quickValid;
    return p;
  }, [filters, quickValid]);

  const state = useAdminResource<FinanceInstallment[] | Record<string, unknown>>(
    endpoints.admin.financeInstallments,
    query,
  );
  const parsed = useMemo(() => parseFinanceQuickListResponse<FinanceInstallment>(state.data), [state.data]);
  const rows = parsed.items;
  const summary = parsed.summary;
  const applied = parsed.appliedFilters;
  const serviceFacets = parsed.serviceFacets;
  const pg = state.meta?.pagination;

  const hasActiveQuery = installmentsListHasActiveQuery(filters);
  const emptyVariant = resolveInstallmentsListEmptyVariant({ hasActiveQuery });
  const isRefetching = state.fetching && !state.initialLoading;
  const quickChipKey = installmentQuickFilterChipLabelKey(quickValid);
  const selectedService = serviceFacets.find(
    (facet) => String(facet.service_id) === filters.serviceId,
  );
  const selectedServiceLabel = filters.serviceId
    ? selectedService?.service_name ??
      t('admin.finance.installments.servicesFilter.unknown', { id: filters.serviceId })
    : null;
  const allServicesCount = serviceFacets.reduce((total, facet) => total + facet.count, 0);

  const columns: Column<FinanceInstallment>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => {
          const sid = row.student_id;
          const label = row.student_name ?? t('common.dash');
          if (!sid) return <span dir="auto">{label}</span>;
          return (
            <Link href={buildStudentFinanceLink(sid, 'finance', returnTo)} onClick={(e) => e.stopPropagation()} dir="auto">
              {label}
            </Link>
          );
        },
      },
      {
        key: 'student_code',
        header: t('admin.finance.installments.columns.studentCode'),
        render: (row) => (
          <span className="mono" dir="ltr">
            {row.student_code ?? t('common.dash')}
          </span>
        ),
      },
      {
        key: 'class',
        header: t('admin.finance.installments.columns.class'),
        render: (row) => <span dir="auto">{row.class_name ?? t('common.dash')}</span>,
      },
      {
        key: 'level',
        header: t('admin.finance.installments.columns.level'),
        render: (row) => <span dir="auto">{row.level_name ?? t('common.dash')}</span>,
      },
      {
        key: 'description',
        header: t('admin.finance.installments.columns.description'),
        render: (row) => (
          <span dir="auto">{row.installment_description ?? row.service_name ?? row.name ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'due_date',
        header: t('admin.finance.installments.columns.dueDate'),
        render: (row) => (
          <span className="finance-receivable-list__date" dir="ltr">
            {formatInstallmentListDate(row.due_date, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'total',
        header: t('admin.finance.installments.columns.total'),
        render: (row) => <FinanceMoney amount={row.total_amount ?? row.amount} />,
      },
      {
        key: 'paid',
        header: t('admin.finance.installments.columns.paid'),
        render: (row) => <FinanceMoney amount={row.paid_amount} />,
      },
      {
        key: 'remaining',
        header: t('admin.finance.installments.columns.remaining'),
        render: (row) => <FinanceMoney amount={row.remaining_amount} />,
      },
      {
        key: 'overdue_amount',
        header: t('admin.finance.installments.columns.overdueAmount'),
        render: (row) => <FinanceMoney amount={row.overdue_amount} />,
      },
      {
        key: 'days_overdue',
        header: t('admin.finance.installments.columns.daysOverdue'),
        render: (row) =>
          row.days_overdue != null && row.days_overdue > 0 ? (
            <span className="mono" dir="ltr">
              {row.days_overdue}
            </span>
          ) : (
            t('common.dash')
          ),
      },
      {
        key: 'status',
        header: t('admin.finance.installments.columns.status'),
        render: (row) => (
          <InstallmentStatusBadges
            paymentStatus={row.payment_status ?? 'unpaid'}
            timingStatus={row.timing_status ?? 'not_applicable'}
          />
        ),
      },
      {
        key: 'actions',
        header: t('admin.finance.installments.columns.actions'),
        render: (row) => {
          const sid = row.student_id;
          if (!sid) return t('common.dash');
          return (
            <Link
              href={buildStudentFinanceLink(sid, 'finance', returnTo)}
              className="btn btn--ghost btn--sm"
              onClick={(e) => e.stopPropagation()}
            >
              {t('admin.finance.installments.openDetails')}
            </Link>
          );
        },
      },
    ],
    [t, formatDate, returnTo],
  );

  function setQuick(next: InstallmentQuickFilter | '') {
    onFiltersChange({ quick: next || null, page: 1 });
  }

  function setService(serviceId: number | null) {
    const next = serviceId == null ? null : String(serviceId);
    onFiltersChange({ serviceId: filters.serviceId === next ? null : next, page: 1 });
  }

  function resetAll() {
    onFiltersChange({
      quick: null,
      search: null,
      academicYearId: null,
      classId: null,
      levelId: null,
      studentId: null,
      billingPartnerId: null,
      serviceId: null,
      dueDateFrom: null,
      dueDateTo: null,
      page: 1,
    });
  }

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        title={t('admin.finance.installments.noMatch.title')}
        description={t('admin.finance.installments.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
            {t('admin.finance.installments.showAll')}
          </button>
        }
      />
    ) : (
      <EmptyState
        title={t('admin.finance.installments.emptyTitle')}
        description={t('admin.finance.installments.emptyDesc')}
      />
    );

  return (
    <div className="finance-receivable-list finance-installments-list">
      {filters.billingPartnerId ? (
        <BillingPartnerScopeChip
          billingPartnerId={filters.billingPartnerId}
          onClear={() => onFiltersChange({ billingPartnerId: null, page: 1 })}
        />
      ) : null}

      {apiError ? (
        <ApiErrorView
          error={{ code: 'invalid_quick_filter', message: t('admin.finance.errors.invalidQuickFilter') }}
        />
      ) : null}

      {summary ? (
        <div className="finance-metrics-grid finance-installments-summary finance-receivable-list__context">
          <div className="card finance-metric-card">
            <span className="muted">{t('admin.finance.installments.summaryCount')}</span>
            <strong className="mono" dir="ltr">
              {summary.total_count ?? pg?.total ?? 0}
            </strong>
          </div>
          {summary.total_remaining != null ? (
            <div className="card finance-metric-card">
              <span className="muted">{t('admin.finance.installments.summaryRemaining')}</span>
              <strong>
                <FinanceMoney amount={summary.total_remaining} />
              </strong>
            </div>
          ) : null}
          {summary.total_overdue != null && quickValid === 'overdue_unpaid' ? (
            <div className="card finance-metric-card">
              <span className="muted">{t('admin.finance.installments.summaryOverdue')}</span>
              <strong>
                <FinanceMoney amount={summary.total_overdue} />
              </strong>
            </div>
          ) : null}
          {applied?.as_of_date ? (
            <div className="card finance-metric-card">
              <span className="muted">{t('admin.finance.installments.asOfDate')}</span>
              <strong className="finance-receivable-list__date" dir="ltr">
                {formatInstallmentListDate(String(applied.as_of_date), formatDate, t('common.dash'))}
              </strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {pg ? (
        <p className="finance-receivable-list__result-count" dir="ltr">
          {t('admin.finance.installments.resultCount', { total: pg.total })}
        </p>
      ) : null}

      {serviceFacets.length > 0 || filters.serviceId ? (
        <section
          className="finance-receivable-list__facet-group"
          aria-labelledby="installment-services-filter-title"
        >
          <div className="finance-receivable-list__facet-header">
            <h2 id="installment-services-filter-title" className="finance-receivable-list__facet-title">
              {t('admin.finance.installments.servicesFilter.title')}
            </h2>
            <span className="finance-receivable-list__facet-hint">
              {t('admin.finance.installments.servicesFilter.hint')}
            </span>
          </div>
          <div className="finance-receivable-list__service-filters">
            <button
              type="button"
              className={`finance-receivable-list__service-filter${!filters.serviceId ? ' is-active' : ''}`}
              aria-pressed={!filters.serviceId}
              onClick={() => setService(null)}
            >
              <span>{t('admin.finance.installments.servicesFilter.all')}</span>
              <span className="finance-receivable-list__service-count" dir="ltr">
                {allServicesCount}
              </span>
            </button>
            {serviceFacets.map((facet) => (
              <button
                key={facet.service_id}
                type="button"
                className={`finance-receivable-list__service-filter${
                  filters.serviceId === String(facet.service_id) ? ' is-active' : ''
                }`}
                aria-pressed={filters.serviceId === String(facet.service_id)}
                aria-label={t('admin.finance.installments.servicesFilter.select', {
                  service: facet.service_name,
                  count: facet.count,
                })}
                onClick={() => setService(facet.service_id)}
              >
                <span dir="auto">{facet.service_name}</span>
                <span className="finance-receivable-list__service-count" dir="ltr">
                  {facet.count}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="finance-cheque-quick-filters finance-cheque-quick-filters--compact finance-receivable-list__tabs">
        <button
          type="button"
          className={`btn btn--ghost btn--sm${!quickValid ? ' is-active' : ''}`}
          onClick={() => setQuick('')}
        >
          {t('admin.finance.installments.quick.all')}
        </button>
        {QUICK_TABS.map((key) => (
          <button
            key={key}
            type="button"
            className={`btn btn--ghost btn--sm${quickValid === key ? ' is-active' : ''}`}
            onClick={() => setQuick(quickValid === key ? '' : key)}
          >
            {t(installmentQuickFilterLabelKey(key))}
          </button>
        ))}
      </div>

      {quickChipKey || selectedServiceLabel ? (
        <div className="finance-receivable-list__chips">
          {quickChipKey ? (
            <span className="finance-receivable-list__chip">
              {t('admin.finance.installments.activeFilterChip', {
                filter: t(quickChipKey),
              })}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('admin.finance.installments.clearFilter')}
                onClick={() => setQuick('')}
              >
                ×
              </button>
            </span>
          ) : null}
          {selectedServiceLabel ? (
            <span className="finance-receivable-list__chip">
              {t('admin.finance.installments.servicesFilter.active', {
                service: selectedServiceLabel,
              })}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('admin.finance.installments.servicesFilter.clear')}
                onClick={() => setService(null)}
              >
                ×
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      <form
        className="toolbar finance-hub-filters finance-receivable-list__toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onFiltersChange({
            search: String(fd.get('search') ?? '').trim() || null,
            academicYearId: String(fd.get('academic_year_id') ?? '') || null,
            classId: String(fd.get('class_id') ?? '').trim() || null,
            levelId: String(fd.get('level_id') ?? '').trim() || null,
            studentId: String(fd.get('student_id') ?? '').trim() || null,
            dueDateFrom: String(fd.get('due_date_from') ?? '') || null,
            dueDateTo: String(fd.get('due_date_to') ?? '') || null,
            quick: null,
            page: 1,
          });
        }}
      >
        <div className="finance-receivable-list__search">
          <input
            className="input"
            name="search"
            placeholder={t('admin.finance.installments.searchPlaceholder')}
            defaultValue={filters.search}
            dir="auto"
          />
          {filters.search ? (
            <button
              type="button"
              className="finance-receivable-list__search-clear"
              aria-label={t('common.clear')}
              onClick={() => onFiltersChange({ search: null, page: 1 })}
            >
              ×
            </button>
          ) : null}
        </div>
        <select className="input" name="academic_year_id" defaultValue={filters.academicYearId}>
          <option value="">{t('admin.finance.installments.filters.allYears')}</option>
          {yearOptions.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          name="class_id"
          placeholder={t('admin.finance.installments.filters.classId')}
          defaultValue={filters.classId}
          dir="ltr"
        />
        <input
          className="input"
          name="level_id"
          placeholder={t('admin.finance.installments.filters.levelId')}
          defaultValue={filters.levelId}
          dir="ltr"
        />
        <input
          className="input"
          name="student_id"
          placeholder={t('admin.finance.installments.filters.studentId')}
          defaultValue={filters.studentId}
          dir="ltr"
        />
        <input
          className="input"
          type="date"
          name="due_date_from"
          defaultValue={filters.dueDateFrom}
          aria-label={t('admin.finance.installments.filters.dueFrom')}
          dir="ltr"
        />
        <input
          className="input"
          type="date"
          name="due_date_to"
          defaultValue={filters.dueDateTo}
          aria-label={t('admin.finance.installments.filters.dueTo')}
          dir="ltr"
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
        {hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
            {t('admin.finance.collections.resetFilters')}
          </button>
        ) : null}
      </form>

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.installments.refetching')}
        </p>
      ) : null}

      <div
        className={
          isRefetching
            ? 'finance-receivable-list__results finance-receivable-list__results--fetching'
            : 'finance-receivable-list__results'
        }
        aria-busy={isRefetching || undefined}
      >
        <ResourceView
          state={{ ...state, data: rows as FinanceInstallment[] | null }}
          loadingLabel={t('common.loading')}
          isEmpty={(list) => list.length === 0}
          empty={listEmptyState}
        >
          {(list) => (
            <>
              <DataTable columns={columns} rows={list} rowKey={(row) => row.id ?? `${row.student_id}-${row.due_date}`} />
              {pg ? (
                <Pagination
                  page={pg.page}
                  pageSize={pg.page_size ?? INSTALLMENTS_PAGE_SIZE}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  onPage={(p) => onFiltersChange({ page: p })}
                />
              ) : null}
            </>
          )}
        </ResourceView>
      </div>
    </div>
  );
}
