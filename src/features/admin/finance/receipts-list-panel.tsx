'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import { FamilyReceiptListMeta } from '@/features/admin/finance/family-receipt-list-meta';
import { ReceiptActionsMenu } from '@/features/admin/finance/receipt-actions-menu';
import { ReceiptDetailDrawer } from '@/features/admin/finance/receipt-detail-drawer';
import {
  ReceiptSettlementBadge,
  ReceiptStateBadge,
} from '@/features/admin/finance/receipt-status-badges';
import {
  RECEIPTS_PAGE_SIZE,
  formatReceiptListDateTime,
  receiptsListHasActiveQuery,
  resolveReceiptsListEmptyVariant,
} from '@/features/admin/finance/utils/receipts-list-present';
import { resolveReceiptChildrenCount } from '@/features/admin/finance/utils/family-receipt-present';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { parseFinanceReceiptList } from '@/lib/utils/normalize-finance-receipt';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { FinanceReceipt } from '@/types/finance';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/receivable-lists.css';
import '@/features/admin/finance/payment-documents-lists.css';

export type ReceiptsListFilters = {
  search: string;
  studentId: string;
  involvedStudentId: string;
  payerId: string;
  billingPartnerId: string;
  collectionId: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: string;
  state: string;
  page: number;
};

type ReceiptsListPanelProps = {
  filters: ReceiptsListFilters;
  onFiltersChange: (
    updates: Partial<Record<keyof ReceiptsListFilters, string | number | null>>,
  ) => void;
  returnTo?: string;
};

export function ReceiptsListPanel({
  filters,
  onFiltersChange,
  returnTo = '/admin/finance/receipts',
}: ReceiptsListPanelProps) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const { schools, activeSchoolId } = useAdminSession();
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  const query: ListParams = useMemo(
    () => ({
      page: filters.page,
      page_size: RECEIPTS_PAGE_SIZE,
      search: filters.search || undefined,
      student_id: filters.studentId || undefined,
      involved_student_id: filters.involvedStudentId || undefined,
      payer_id: filters.payerId || undefined,
      billing_partner_id: filters.billingPartnerId || undefined,
      collection_id: filters.collectionId || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      payment_method: filters.paymentMethod || undefined,
      state: filters.state || undefined,
    }),
    [filters],
  );

  const state = useAdminResource<FinanceReceipt[]>(endpoints.admin.financeReceipts, query);
  const rows = useMemo(() => parseFinanceReceiptList(state.data), [state.data]);
  const pg = state.meta?.pagination;

  const hasActiveQuery = receiptsListHasActiveQuery(filters);
  const emptyVariant = resolveReceiptsListEmptyVariant({ hasActiveQuery });
  const isRefetching = state.fetching && !state.initialLoading;

  const columns: Column<FinanceReceipt>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.receipts.columns.number'),
        render: (row) => (
          <span className="mono" dir="ltr">
            {row.number ?? row.receipt_number ?? t('common.dash')}
          </span>
        ),
      },
      {
        key: 'issued_at',
        header: t('admin.finance.receipts.columns.issuedAt'),
        render: (row) => (
          <span className="finance-receivable-list__date" dir="ltr">
            {formatReceiptListDateTime(row.issued_at, formatDateTime, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => {
          const sid = row.student_id;
          const label = row.student_name ?? t('common.dash');
          const childrenCount = resolveReceiptChildrenCount(row);
          return (
            <div className="finance-receipt-family-cell">
              {sid ? (
                <Link
                  href={buildStudentFinanceLink(sid, 'finance', returnTo)}
                  onClick={(e) => e.stopPropagation()}
                  dir="auto"
                >
                  {label}
                </Link>
              ) : (
                <span dir="auto">{label}</span>
              )}
              <FamilyReceiptListMeta receipt={row} />
              {childrenCount != null && childrenCount > 0 ? (
                <span className="sr-only">
                  {t('admin.finance.receipts.childrenCountLabel', { count: childrenCount })}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'payer',
        header: t('admin.finance.receipts.columns.payer'),
        render: (row) => <span dir="auto">{row.payer_name ?? t('common.dash')}</span>,
      },
      {
        key: 'collection_amount',
        header: t('admin.finance.receipts.columns.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.collection_amount} currency={row.currency} />,
      },
      {
        key: 'allocated_amount',
        header: t('admin.finance.receipts.columns.allocatedAmount'),
        render: (row) => <FinanceMoney amount={row.allocated_amount} currency={row.currency} />,
      },
      {
        key: 'unallocated_amount',
        header: t('admin.finance.receipts.columns.unallocatedAmount'),
        render: (row) => <FinanceMoney amount={row.unallocated_amount} currency={row.currency} />,
      },
      {
        key: 'payment_method',
        header: t('admin.finance.paymentMethod'),
        render: (row) => paymentMethodLabel(row.payment_method, t),
      },
      {
        key: 'settlement_status',
        header: t('admin.finance.receipts.columns.settlementStatus'),
        render: (row) =>
          row.settlement_status ? (
            <ReceiptSettlementBadge status={row.settlement_status} />
          ) : (
            t('common.dash')
          ),
      },
      {
        key: 'state',
        header: t('admin.finance.receipts.columns.receiptState'),
        render: (row) => <ReceiptStateBadge state={row.state ?? 'issued'} />,
      },
      {
        key: 'issued_by',
        header: t('admin.finance.receipts.columns.issuedBy'),
        render: (row) => {
          const name =
            typeof row.issued_by === 'string'
              ? row.issued_by
              : row.issued_by && typeof row.issued_by === 'object'
                ? row.issued_by.name
                : null;
          return <span dir="auto">{name ?? t('common.dash')}</span>;
        },
      },
      {
        key: 'actions',
        header: t('admin.finance.receipts.columns.actions'),
        className: 'finance-receipts-actions-col',
        render: (row) => (
          <div className="finance-payment-docs-list__actions">
            <ReceiptActionsMenu receipt={row} onView={() => setSelectedReceiptId(row.id)} />
          </div>
        ),
      },
    ],
    [formatDateTime, returnTo, t],
  );

  function resetAll() {
    onFiltersChange({
      search: null,
      studentId: null,
      involvedStudentId: null,
      payerId: null,
      billingPartnerId: null,
      collectionId: null,
      dateFrom: null,
      dateTo: null,
      paymentMethod: null,
      state: null,
      page: 1,
    });
  }

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        title={t('admin.finance.receipts.noMatch.title')}
        description={t('admin.finance.receipts.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
            {t('admin.finance.collections.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState
        title={t('admin.finance.receipts.empty')}
        description={t('admin.finance.receipts.emptyDesc')}
      />
    );

  return (
    <div className="finance-receivable-list finance-payment-docs-list finance-receipts-list">
      {filters.billingPartnerId ? (
        <BillingPartnerScopeChip
          billingPartnerId={filters.billingPartnerId}
          onClear={() => onFiltersChange({ billingPartnerId: null, page: 1 })}
        />
      ) : null}
      {filters.involvedStudentId ? (
        <div className="finance-receivable-list__chips" aria-label={t('admin.finance.receipts.activeFilters')}>
          <span className="finance-receivable-list__chip">
            <span dir="ltr">
              {t('admin.finance.receipts.involvedStudentFilterChip', {
                id: filters.involvedStudentId,
              })}
            </span>
            <button
              type="button"
              className="finance-receivable-list__chip-clear"
              aria-label={t('common.clear')}
              onClick={() => onFiltersChange({ involvedStudentId: null, page: 1 })}
            >
              ×
            </button>
          </span>
        </div>
      ) : null}

      <div className="finance-receivable-list__context">
        {activeSchool ? (
          <p className="muted">
            {t('admin.finance.activeSchool')}: <strong dir="auto">{activeSchool.name}</strong>
          </p>
        ) : null}
        {pg?.total != null ? (
          <p className="finance-receivable-list__result-count" dir="ltr">
            {t('admin.finance.receipts.resultCount', { total: pg.total })}
          </p>
        ) : null}
      </div>

      <form
        className="toolbar finance-hub-filters finance-receipts-filters finance-receivable-list__toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onFiltersChange({
            search: String(fd.get('search') ?? '').trim() || null,
            studentId: String(fd.get('student_id') ?? '').trim() || null,
            payerId: String(fd.get('payer_id') ?? '').trim() || null,
            collectionId: String(fd.get('collection_id') ?? '').trim() || null,
            dateFrom: String(fd.get('date_from') ?? '') || null,
            dateTo: String(fd.get('date_to') ?? '') || null,
            paymentMethod: String(fd.get('payment_method') ?? '') || null,
            state: String(fd.get('state') ?? '') || null,
            page: 1,
          });
        }}
      >
        <div className="finance-receivable-list__search">
          <input
            className="input"
            name="search"
            placeholder={t('admin.finance.receipts.searchPlaceholder')}
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
        <input
          className="input"
          name="student_id"
          placeholder={t('admin.finance.receipts.studentIdFilter')}
          defaultValue={filters.studentId}
          dir="ltr"
        />
        <input
          className="input"
          name="payer_id"
          placeholder={t('admin.finance.receipts.payerIdFilter')}
          defaultValue={filters.payerId}
          dir="ltr"
        />
        <input
          className="input"
          name="collection_id"
          placeholder={t('admin.finance.receipts.collectionIdFilter')}
          defaultValue={filters.collectionId}
          dir="ltr"
        />
        <input
          className="input"
          type="date"
          name="date_from"
          defaultValue={filters.dateFrom}
          dir="ltr"
        />
        <input className="input" type="date" name="date_to" defaultValue={filters.dateTo} dir="ltr" />
        <select className="input" name="payment_method" defaultValue={filters.paymentMethod}>
          <option value="">{t('admin.finance.receipts.filters.allMethods')}</option>
          <option value="cash">{t('admin.finance.methods.cash')}</option>
          <option value="cheque">{t('admin.finance.methods.cheque')}</option>
          <option value="transfer">{t('admin.finance.methods.transfer')}</option>
          <option value="card">{t('admin.finance.methods.card')}</option>
        </select>
        <select className="input" name="state" defaultValue={filters.state}>
          <option value="">{t('admin.finance.receipts.filters.allStates')}</option>
          <option value="issued">{t('admin.finance.receipts.states.issued')}</option>
          <option value="reversed">{t('admin.finance.receipts.states.reversed')}</option>
          <option value="cancelled_before_issue">
            {t('admin.finance.receipts.states.cancelled_before_issue')}
          </option>
        </select>
        <button type="submit" className="btn btn--ghost btn--sm">
          {t('admin.search')}
        </button>
        {hasActiveQuery ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
            {t('admin.finance.collections.resetFilters')}
          </button>
        ) : null}
      </form>

      {hasActiveQuery ? (
        <div
          className="finance-receivable-list__chips"
          aria-label={t('admin.finance.receipts.activeFilters')}
        >
          {filters.search ? (
            <span className="finance-receivable-list__chip">
              <span dir="auto">{filters.search}</span>
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => onFiltersChange({ search: null, page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
          {filters.paymentMethod ? (
            <span className="finance-receivable-list__chip">
              {paymentMethodLabel(filters.paymentMethod, t)}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => onFiltersChange({ paymentMethod: null, page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
          {filters.state ? (
            <span className="finance-receivable-list__chip">
              {t(`admin.finance.receipts.states.${filters.state}`)}
              <button
                type="button"
                className="finance-receivable-list__chip-clear"
                aria-label={t('common.clear')}
                onClick={() => onFiltersChange({ state: null, page: 1 })}
              >
                ×
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      {isRefetching ? (
        <p className="finance-receivable-list__fetching" aria-live="polite">
          {t('admin.finance.receipts.refetching')}
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
          state={{ ...state, data: rows }}
          loadingLabel={t('common.loading')}
          isEmpty={(list) => list.length === 0}
          empty={listEmptyState}
        >
          {(list) => (
            <>
              <div className="finance-payment-docs-list__table-wrap finance-receipts-table-wrap">
                <DataTable
                  columns={columns}
                  rows={list}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => setSelectedReceiptId(row.id)}
                />
              </div>
              {pg ? (
                <Pagination
                  page={pg.page}
                  pageSize={pg.page_size ?? RECEIPTS_PAGE_SIZE}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  onPage={(p) => onFiltersChange({ page: p })}
                />
              ) : null}
            </>
          )}
        </ResourceView>
      </div>

      <ReceiptDetailDrawer
        open={selectedReceiptId != null}
        receiptId={selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
        returnTo={returnTo}
      />
    </div>
  );
}
