'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { ResourceView } from '@/components/states/resource';
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
import { isCollectionChequeReversed, isChequePayment } from '@/lib/utils/cheque';
import type { ParentFinanceCollection, PaymentAllocation } from '@/types/finance';

export default function ParentChildFinanceCollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>;
}) {
  const { id, collectionId } = use(params);
  const t = useT();
  const { formatDate } = useFormat();
  const state = useResource<ParentFinanceCollection>(
    endpoints.parent.childFinanceCollection(id, collectionId),
  );

  const allocationColumns: Column<PaymentAllocation>[] = useMemo(
    () => [
      {
        key: 'fee',
        header: t('parent.finance.fee'),
        render: (row) => refName(row.student_fee) ?? t('common.dash'),
      },
      {
        key: 'installment',
        header: t('parent.finance.installment'),
        render: (row) => refName(row.installment) ?? t('common.dash'),
      },
      {
        key: 'amount',
        header: t('parent.finance.amount'),
        render: (row) => (
          <FinanceMoney amount={row.amount} currency={state.data?.currency} />
        ),
      },
    ],
    [t, state.data?.currency],
  );

  return (
    <>
      <Link href={`/parent/children/${id}/finance/collections`} className="back-link">
        ‹ {t('parent.finance.allCollections')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(coll) => (
          <>
            <PageHeader
              title={coll.reference ?? coll.receipt_number ?? coll.name ?? t('parent.finance.collectionDetail')}
            />
            <ChildFinanceSubnav id={id} />
            <div className="card">
              <dl className="detail-list">
                <div>
                  <dt>{t('parent.finance.collectionDate')}</dt>
                  <dd>{formatDate(coll.collection_date ?? coll.date) || t('common.dash')}</dd>
                </div>
                <div>
                  <dt>{t('parent.finance.amount')}</dt>
                  <dd>
                    <FinanceMoney amount={coll.amount ?? coll.total_amount} currency={coll.currency} />
                  </dd>
                </div>
                <div>
                  <dt>{t('parent.finance.paymentMethod')}</dt>
                  <dd>{paymentMethodLabel(String(coll.payment_method ?? ''), t)}</dd>
                </div>
                {coll.reference && (
                  <div>
                    <dt>{t('parent.finance.reference')}</dt>
                    <dd>{coll.reference}</dd>
                  </div>
                )}
                <div>
                  <dt>{t('academic.status')}</dt>
                  <dd>
                    {isCollectionChequeReversed(coll) || isChequePayment(coll.payment_method) || coll.cheque ? (
                      <ChequePaymentMarker collection={coll} variant="parent" />
                    ) : (
                      <FinanceStatusBadge state={collectionState(coll)} />
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {(coll.allocations?.length ?? 0) > 0 && (
              <section className="card">
                <h3>{t('parent.finance.allocations')}</h3>
                <DataTable
                  columns={allocationColumns}
                  rows={coll.allocations ?? []}
                  rowKey={(row) => row.id ?? `${row.student_fee_id}-${row.installment_id}-${row.amount}`}
                />
              </section>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
