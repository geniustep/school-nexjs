'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { FamilyReceiptListMeta } from '@/features/admin/finance/family-receipt-list-meta';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { ReceiptActionsMenu } from '@/features/admin/finance/receipt-actions-menu';
import { ReceiptDetailDrawer } from '@/features/admin/finance/receipt-detail-drawer';
import {
  ReceiptSettlementBadge,
  ReceiptStateBadge,
} from '@/features/admin/finance/receipt-status-badges';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { parseFinanceReceiptList } from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

const BILLING_ACCOUNT_RECEIPTS_PAGE_SIZE = 5;

export function BillingAccountReceiptsSection({
  billingPartnerId,
  returnTo,
  receiptCount,
  receiptAmount,
  currency,
}: {
  billingPartnerId: number;
  returnTo: string;
  receiptCount?: number;
  receiptAmount?: number;
  currency?: unknown;
}) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  const state = useAdminResource<FinanceReceipt[]>(endpoints.admin.financeReceipts, {
    billing_partner_id: billingPartnerId,
    page: 1,
    page_size: BILLING_ACCOUNT_RECEIPTS_PAGE_SIZE,
  });

  const rows = useMemo(() => parseFinanceReceiptList(state.data), [state.data]);
  const allReceiptsHref = `/admin/finance/receipts?billing_partner_id=${billingPartnerId}&returnTo=${encodeURIComponent(returnTo)}`;

  const columns: Column<FinanceReceipt>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t('admin.finance.receipts.columns.number'),
        render: (row) => (
          <div className="finance-receipt-family-cell">
            <span className="mono" dir="ltr">
              {row.number ?? row.receipt_number ?? t('common.dash')}
            </span>
            <FamilyReceiptListMeta receipt={row} />
          </div>
        ),
      },
      {
        key: 'issued_at',
        header: t('admin.finance.receipts.columns.issuedAt'),
        render: (row) => (
          <span dir="ltr">{formatDateTime(row.issued_at) || t('common.dash')}</span>
        ),
      },
      {
        key: 'amount',
        header: t('admin.finance.receipts.columns.collectionAmount'),
        render: (row) => (
          <FinanceMoney amount={row.collection_amount} currency={row.currency ?? currency} />
        ),
      },
      {
        key: 'state',
        header: t('admin.finance.receipts.columns.receiptState'),
        render: (row) => (
          <span className="finance-status-badges-inline">
            <ReceiptStateBadge state={row.state ?? 'issued'} />
            {row.settlement_status ? (
              <ReceiptSettlementBadge status={row.settlement_status} />
            ) : null}
          </span>
        ),
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
    [currency, formatDateTime, t],
  );

  return (
    <section className="finance-billing-section finance-billing-receipts-section">
      <div className="between finance-billing-receipts-section__head">
        <div>
          <h2>{t('admin.finance.billingAccounts.receiptsSection.title')}</h2>
          {receiptCount != null || receiptAmount != null ? (
            <p className="muted tiny">
              {receiptCount != null
                ? t('admin.finance.billingAccounts.receiptsSection.summaryCount', {
                    count: receiptCount,
                  })
                : null}
              {receiptCount != null && receiptAmount != null ? ' · ' : null}
              {receiptAmount != null ? (
                <FinanceMoney amount={receiptAmount} currency={currency} />
              ) : null}
            </p>
          ) : null}
        </div>
        <Link href={allReceiptsHref} className="btn btn--ghost btn--sm">
          {t('admin.finance.billingAccounts.receiptsSection.viewAll')}
        </Link>
      </div>

      {state.initialLoading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : null}
      {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}
      {!state.initialLoading && !state.error && rows.length === 0 ? (
        <p className="muted">{t('admin.finance.billingAccounts.receiptsSection.empty')}</p>
      ) : null}
      {rows.length > 0 ? (
        <div className="finance-billing-receipts-section__table">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedReceiptId(row.id)}
          />
        </div>
      ) : null}

      <ReceiptDetailDrawer
        open={selectedReceiptId != null}
        receiptId={selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
        returnTo={returnTo}
      />
    </section>
  );
}
