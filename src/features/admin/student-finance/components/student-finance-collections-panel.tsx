'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { CollectionDetailDrawer } from '@/features/admin/finance/collection-detail-drawer';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { StudentReceiptsSection } from '@/features/admin/student-finance/components/student-receipts-section';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { resolveCollectionPayerLabel } from '@/features/admin/finance/collection-payer-label';
import { isChequePayment } from '@/lib/utils/cheque';
import { collectionState, paymentMethodLabel } from '@/lib/utils/finance';
import type { PaymentCollection } from '@/types/finance';
import { EmptyState } from '@/components/states/states';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import type { StudentFinancePanelProps } from './student-finance-panel-props';

export function StudentFinanceCollectionsPanel({
  studentId,
  workspace,
  financialOverview,
  financeRefreshSignal = 0,
  canViewPayments,
  canCollect,
  onOpenCollection,
}: StudentFinancePanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const currency = financialOverview?.totals.currency.name ?? workspace?.summary?.currency?.name;

  const collectionColumns: Column<PaymentCollection>[] = useMemo(
    () => [
      {
        key: 'date',
        header: t('admin.student360.financeOps.collections.date'),
        render: (row) => formatDate(row.collection_date ?? row.date),
      },
      {
        key: 'amount',
        header: t('admin.student360.financeOps.collections.amount'),
        render: (row) => (
          <FinanceMoney amount={row.amount ?? row.total_amount} currency={row.currency ?? currency} />
        ),
      },
      {
        key: 'method',
        header: t('admin.student360.financeOps.collections.method'),
        render: (row) => {
          const label = paymentMethodLabel(row.payment_method, t);
          if (isChequePayment(row.payment_method) && row.state !== 'cancelled') {
            return `${label} — ${t('admin.student360.financeWorkspace.collections.pendingCheque')}`;
          }
          return label;
        },
      },
      {
        key: 'payer',
        header: t('admin.student360.financeOps.collections.payer'),
        render: (row) =>
          row.payer_name?.trim() ||
          resolveCollectionPayerLabel(
            {
              payer_name: row.payer_name,
              billing_partner_name: (row as { billing_partner_name?: string }).billing_partner_name,
              billing_partner: row.billing_partner,
            },
            t('common.dash'),
          ),
      },
      {
        key: 'receipt',
        header: t('admin.finance.receiptNumber'),
        render: (row) => row.receipt_number ?? (row.receipt_id ? `#${row.receipt_id}` : t('common.dash')),
      },
      {
        key: 'state',
        header: t('admin.student360.financeOps.collections.state'),
        render: (row) => <FinanceStatusBadge state={collectionState(row)} />,
      },
    ],
    [t, formatDate, currency],
  );

  const collections = workspace?.recent_collections ?? [];

  return (
    <>
      <Card className="student-finance-section">
        <Student360SectionHeader
          title={t('admin.student360.financeWorkspace.tabs.collections')}
          description={t('admin.student360.financeWorkspace.collections.description')}
          action={
            <div className="row">
              {canCollect ? (
                <button type="button" className="btn btn--primary btn--sm" onClick={onOpenCollection}>
                  {t('admin.finance.collectionWorkflow.recordPayment')}
                </button>
              ) : null}
              <Link
                href={`/admin/finance/collections?student_id=${studentId}`}
                className="btn btn--ghost btn--sm"
              >
                {t('admin.student360.financeOps.viewAllCollections')}
              </Link>
            </div>
          }
        />

        {collections.length === 0 ? (
          <EmptyState title={t('admin.student360.financeWorkspace.collections.emptyTitle')} />
        ) : (
          <div className="student-finance-table-wrap">
            <DataTable
              columns={collectionColumns}
              rows={collections}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedCollectionId(row.id)}
            />
          </div>
        )}
      </Card>

      {canViewPayments ? (
        <Card className="student-finance-section">
          <StudentReceiptsSection studentId={studentId} refreshSignal={financeRefreshSignal} />
        </Card>
      ) : null}

      <CollectionDetailDrawer
        open={selectedCollectionId != null}
        collectionId={selectedCollectionId}
        onClose={() => setSelectedCollectionId(null)}
      />
    </>
  );
}
