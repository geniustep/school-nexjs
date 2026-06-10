'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChequePaymentMarker } from '@/features/admin/finance/cheque-payment-marker';
import { ChildFinanceSubnav } from '@/features/parent/finance/child-finance-subnav';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import { collectionState, paymentMethodLabel, refName } from '@/lib/utils/finance';
import { isChequePayment } from '@/lib/utils/cheque';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { ParentFinanceCollection } from '@/types/finance';

export default function ParentChildFinanceCollectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const state = useResource<ParentFinanceCollection[]>(
    endpoints.parent.childFinanceCollections(id),
  );
  const rows = parseFinanceList<ParentFinanceCollection>(state.data);

  const columns: Column<ParentFinanceCollection>[] = useMemo(
    () => [
      {
        key: 'ref',
        header: t('parent.finance.receiptNumber'),
        render: (row) => row.reference ?? row.receipt_number ?? row.name ?? t('common.dash'),
      },
      {
        key: 'date',
        header: t('parent.finance.collectionDate'),
        render: (row) => formatDate(row.collection_date ?? row.date) || t('common.dash'),
      },
      {
        key: 'amount',
        header: t('parent.finance.amount'),
        render: (row) => <FinanceMoney amount={row.amount ?? row.total_amount} currency={row.currency} />,
      },
      {
        key: 'method',
        header: t('parent.finance.paymentMethod'),
        render: (row) => paymentMethodLabel(String(row.payment_method ?? ''), t),
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (row) =>
          isChequePayment(row.payment_method) || row.cheque ? (
            <ChequePaymentMarker collection={row} variant="parent" />
          ) : (
            <FinanceStatusBadge state={collectionState(row)} />
          ),
      },
    ],
    [t, formatDate],
  );

  return (
    <>
      <Link href={`/parent/children/${id}/finance`} className="back-link">
        ‹ {t('parent.finance.backToChildFinance')}
      </Link>
      <PageHeader title={t('parent.finance.allCollections')} />
      <ChildFinanceSubnav id={id} />
      <ResourceView
        state={{ ...state, data: rows.length ? rows : state.data }}
        loadingLabel={t('common.loading')}
        empty={<EmptyState title={t('parent.finance.noCollections')} />}
      >
        {(list) => (
          <DataTable
            columns={columns}
            rows={list}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/parent/children/${id}/finance/collections/${row.id}`)}
          />
        )}
      </ResourceView>
    </>
  );
}
