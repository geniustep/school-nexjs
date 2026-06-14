'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { LoadingState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FinanceMoney } from './finance-money';
import { FinanceStatusBadge } from './finance-status-badge';
import { ChequePaymentMarker } from './cheque-payment-marker';
import { collectionState, paymentMethodLabel, refName } from '@/lib/utils/finance';
import { isChequePayment } from '@/lib/utils/cheque';
import type { PaymentAllocation, PaymentCollection } from '@/types/finance';

export function CollectionDetailDrawer({
  open,
  collectionId,
  onClose,
}: {
  open: boolean;
  collectionId: number | null;
  onClose: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const state = useAdminResource<PaymentCollection>(
    collectionId ? endpoints.admin.financePaymentCollection(collectionId) : null,
  );

  const allocationColumns: Column<PaymentAllocation>[] = useMemo(
    () => [
      {
        key: 'fee',
        header: t('admin.finance.studentFee'),
        render: (row) => refName(row.student_fee) ?? t('common.dash'),
      },
      {
        key: 'installment',
        header: t('admin.finance.installment'),
        render: (row) => refName(row.installment) ?? t('common.dash'),
      },
      {
        key: 'amount',
        header: t('admin.finance.allocationAmount'),
        render: (row) => <FinanceMoney amount={row.amount} />,
      },
    ],
    [t],
  );

  if (!open || !collectionId) return null;

  const coll = state.data;

  return (
    <SetupDrawer open={open} title={t('admin.finance.collectionWorkflow.detailTitle')} onClose={onClose}>
      {state.loading && !coll ? <LoadingState label={t('common.loading')} /> : null}
      {state.error ? <p className="form-error">{state.error.message}</p> : null}
      {coll ? (
        <div className="form-stack finance-collection-detail-drawer">
          <dl className="detail-list">
            <div>
              <dt>{t('admin.finance.reference')}</dt>
              <dd>{coll.reference ?? coll.name ?? `#${coll.id}`}</dd>
            </div>
            <div>
              <dt>{t('academic.status')}</dt>
              <dd>
                <FinanceStatusBadge state={collectionState(coll)} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.finance.collectionAmount')}</dt>
              <dd>
                <FinanceMoney amount={coll.amount ?? coll.total_amount} currency={coll.currency} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.finance.paymentMethod')}</dt>
              <dd>{paymentMethodLabel(coll.payment_method, t)}</dd>
            </div>
            <div>
              <dt>{t('common.date')}</dt>
              <dd>{formatDate(coll.collection_date ?? coll.date)}</dd>
            </div>
            <div>
              <dt>{t('admin.finance.payer')}</dt>
              <dd>{coll.payer_name ?? refName(coll.billing_partner) ?? t('common.dash')}</dd>
            </div>
            {coll.notes ? (
              <div>
                <dt>{t('common.note')}</dt>
                <dd>{coll.notes}</dd>
              </div>
            ) : null}
          </dl>

          {(isChequePayment(coll.payment_method) || coll.cheque) && (
            <div className="finance-collection-detail-drawer__cheque">
              <h4>{t('admin.finance.cheques.title')}</h4>
              <ChequePaymentMarker collection={coll} />
            </div>
          )}

          {(coll.allocations?.length ?? 0) > 0 ? (
            <>
              <h4>{t('admin.finance.collectionWorkflow.allocationsTitle')}</h4>
              <DataTable
                columns={allocationColumns}
                rows={coll.allocations ?? []}
                rowKey={(row) => row.id ?? `${row.student_fee_id ?? 0}-${row.installment_id ?? 0}-${row.amount ?? 0}`}
              />
            </>
          ) : null}

          <Link href={`/admin/finance/collections/${coll.id}`} className="btn btn--ghost btn--sm">
            {t('admin.finance.collectionWorkflow.openFullPage')}
          </Link>
        </div>
      ) : null}
    </SetupDrawer>
  );
}
