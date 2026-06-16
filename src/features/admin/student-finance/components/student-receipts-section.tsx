'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ApiErrorView } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { ReceiptActionsMenu } from '@/features/admin/finance/receipt-actions-menu';
import { ReceiptDetailDrawer } from '@/features/admin/finance/receipt-detail-drawer';
import {
  ReceiptSettlementBadge,
  ReceiptStateBadge,
} from '@/features/admin/finance/receipt-status-badges';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { StudentSectionSkeleton } from '@/features/admin/students/components/student-360-loading';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { paymentMethodLabel } from '@/lib/utils/finance';
import { parseFinanceReceiptList } from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

export function StudentReceiptsSection({
  studentId,
  returnTo,
}: {
  studentId: number;
  returnTo?: string;
}) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  const state = useAdminResource<FinanceReceipt[]>(endpoints.admin.financeReceipts, {
    student_id: studentId,
    page: 1,
    page_size: 5,
  });

  const rows = useMemo(() => parseFinanceReceiptList(state.data), [state.data]);

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
        key: 'amount',
        header: t('admin.finance.receipts.columns.collectionAmount'),
        render: (row) => <FinanceMoney amount={row.collection_amount} currency={row.currency} />,
      },
      {
        key: 'method',
        header: t('admin.finance.paymentMethod'),
        render: (row) => paymentMethodLabel(row.payment_method, t),
      },
      {
        key: 'state',
        header: t('academic.status'),
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
    [formatDateTime, t],
  );

  return (
    <div className="student-finance-section student-receipts-section">
      <Student360SectionHeader
        title={t('admin.finance.receipts.studentSectionTitle')}
        action={
          <Link
            href={`/admin/finance/receipts?student_id=${studentId}`}
            className="btn btn--ghost btn--sm"
          >
            {t('admin.finance.receipts.viewAllForStudent')}
          </Link>
        }
      />
      {state.initialLoading ? <StudentSectionSkeleton rows={3} /> : null}
      {state.error ? <ApiErrorView error={state.error} onRetry={state.reload} /> : null}
      {!state.initialLoading && !state.error && rows.length === 0 ? (
        <p className="muted">{t('admin.finance.receipts.studentEmpty')}</p>
      ) : null}
      {rows.length > 0 ? (
        <div className="student-finance-table-wrap">
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
    </div>
  );
}
