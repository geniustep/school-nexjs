'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { BillingPartnerScopeChip } from '@/features/admin/finance/billing-partner-scope-chip';
import { ReceiptActionsMenu } from '@/features/admin/finance/receipt-actions-menu';
import { ReceiptDetailDrawer } from '@/features/admin/finance/receipt-detail-drawer';
import {
  ReceiptSettlementBadge,
  ReceiptStateBadge,
} from '@/features/admin/finance/receipt-status-badges';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_PAYMENTS } from '@/lib/permissions/finance';
import { parseFinanceReceiptList } from '@/lib/utils/normalize-finance-receipt';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import { sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { FinanceReceipt } from '@/types/finance';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/finance-ui.css';

type ReceiptFilters = {
  search: string;
  studentId: string;
  payerId: string;
  billingPartnerId: string;
  collectionId: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: string;
  state: string;
  page: number;
};

function readFilters(searchParams: URLSearchParams): ReceiptFilters {
  const pageRaw = searchParams.get('page');
  return {
    search: searchParams.get('search') ?? '',
    studentId: searchParams.get('student_id') ?? searchParams.get('studentId') ?? '',
    payerId: searchParams.get('payer_id') ?? '',
    billingPartnerId: searchParams.get('billing_partner_id') ?? '',
    collectionId: searchParams.get('collection_id') ?? '',
    dateFrom: searchParams.get('date_from') ?? '',
    dateTo: searchParams.get('date_to') ?? '',
    paymentMethod: searchParams.get('payment_method') ?? '',
    state: searchParams.get('state') ?? '',
    page: pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1,
  };
}

export default function AdminFinanceReceiptsPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/receipts');
  const { formatDateTime } = useFormat();
  const { schools, activeSchoolId } = useAdminSession();
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  const updateFilters = useCallback(
    (updates: Partial<Record<keyof ReceiptFilters, string | number | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      const map: Record<keyof ReceiptFilters, string> = {
        search: 'search',
        studentId: 'student_id',
        payerId: 'payer_id',
        billingPartnerId: 'billing_partner_id',
        collectionId: 'collection_id',
        dateFrom: 'date_from',
        dateTo: 'date_to',
        paymentMethod: 'payment_method',
        state: 'state',
        page: 'page',
      };
      for (const [key, value] of Object.entries(updates) as Array<[keyof ReceiptFilters, string | number | null]>) {
        const paramKey = map[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) params.delete(paramKey);
        else params.set(paramKey, String(value));
      }
      params.delete('studentId');
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/receipts?${qs}` : '/admin/finance/receipts');
    },
    [router, searchParams],
  );

  const params: ListParams = useMemo(
    () => ({
      page: filters.page,
      page_size: 20,
      search: filters.search || undefined,
      student_id: filters.studentId || undefined,
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

  const state = useAdminResource<FinanceReceipt[]>(endpoints.admin.financeReceipts, params);
  const rows = useMemo(() => parseFinanceReceiptList(state.data), [state.data]);
  const pg = state.meta?.pagination;

  const hasFilters = !!(
    filters.search ||
    filters.studentId ||
    filters.payerId ||
    filters.billingPartnerId ||
    filters.collectionId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.paymentMethod ||
    filters.state
  );

  const columns: Column<FinanceReceipt>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.receipts.columns.number'),
        render: (row) => (
          <span className="mono">{row.number ?? row.receipt_number ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'issued_at',
        header: t('admin.finance.receipts.columns.issuedAt'),
        render: (row) => formatDateTime(row.issued_at) || t('common.dash'),
      },
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => {
          const sid = row.student_id;
          const label = row.student_name ?? t('common.dash');
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
          <ReceiptActionsMenu receipt={row} onView={() => setSelectedReceiptId(row.id)} />
        ),
      },
    ],
    [formatDateTime, returnTo, t],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.receipts.title')}
        subtitle={t('admin.finance.receipts.subtitle')}
        actions={
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => state.reload()}>
            {t('common.refresh')}
          </button>
        }
      />

      {filters.billingPartnerId ? (
        <BillingPartnerScopeChip
          billingPartnerId={filters.billingPartnerId}
          onClear={() => updateFilters({ billingPartnerId: null, page: 1 })}
        />
      ) : null}

      <div className="finance-receipts-meta">
        {activeSchool ? (
          <span className="finance-receipts-meta__item">
            <span className="muted">{t('admin.finance.activeSchool')}</span>
            <strong>{activeSchool.name}</strong>
          </span>
        ) : null}
        {pg?.total != null ? (
          <span className="finance-receipts-meta__item">
            <span className="muted">{t('admin.finance.receipts.resultCount')}</span>
            <strong className="mono">{pg.total}</strong>
          </span>
        ) : null}
      </div>

      <form
        className="toolbar finance-hub-filters finance-receipts-filters"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          updateFilters({
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
        <input
          className="input"
          name="search"
          placeholder={t('admin.finance.receipts.searchPlaceholder')}
          defaultValue={filters.search}
        />
        <input
          className="input"
          name="student_id"
          placeholder={t('admin.finance.receipts.studentIdFilter')}
          defaultValue={filters.studentId}
        />
        <input
          className="input"
          name="payer_id"
          placeholder={t('admin.finance.receipts.payerIdFilter')}
          defaultValue={filters.payerId}
        />
        <input
          className="input"
          name="collection_id"
          placeholder={t('admin.finance.receipts.collectionIdFilter')}
          defaultValue={filters.collectionId}
        />
        <input className="input" type="date" name="date_from" defaultValue={filters.dateFrom} />
        <input className="input" type="date" name="date_to" defaultValue={filters.dateTo} />
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
        {hasFilters ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() =>
              updateFilters({
                search: null,
                studentId: null,
                payerId: null,
                collectionId: null,
                dateFrom: null,
                dateTo: null,
                paymentMethod: null,
                state: null,
                page: 1,
              })
            }
          >
            {t('admin.finance.collections.resetFilters')}
          </button>
        ) : null}
      </form>

      <ResourceView
        state={{ ...state, data: rows }}
        loadingLabel={t('common.loading')}
        empty={
          <EmptyState
            title={
              hasFilters
                ? t('admin.finance.receipts.emptyFiltered')
                : t('admin.finance.receipts.empty')
            }
            description={t('admin.finance.receipts.emptyDesc')}
          />
        }
      >
        {(list) => (
          <>
            <div className="finance-receipts-table-wrap">
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
                totalPages={pg.total_pages}
                total={pg.total}
                onPage={(p) => updateFilters({ page: p })}
              />
            ) : null}
          </>
        )}
      </ResourceView>

      <ReceiptDetailDrawer
        open={selectedReceiptId != null}
        receiptId={selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
        returnTo={returnTo}
      />
    </RequireAdminPermission>
  );
}
