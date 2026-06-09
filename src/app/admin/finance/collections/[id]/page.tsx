'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canCancelPayments, canCollectPayments } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { collectionState, refName } from '@/lib/utils/finance';
import type { PaymentAllocation, PaymentCollection } from '@/types/finance';

export default function AdminFinanceCollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const user = useSession();
  const { formatDate, formatDateTime } = useFormat();
  const state = useAdminResource<PaymentCollection>(endpoints.admin.financePaymentCollection(id));
  const status = state.data ? collectionState(state.data) : 'draft';
  const readOnly = status === 'confirmed' || status === 'cancelled';

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

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance/collections" className="back-link">
        ‹ {t('admin.finance.backToCollections')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(coll) => (
          <>
            <PageHeader
              title={coll.reference ?? coll.name ?? `#${coll.id}`}
              subtitle={refName(coll.student) ?? coll.payer_name ?? undefined}
              actions={
                !readOnly ? (
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {canCollectPayments(user) && status === 'draft' && (
                      <ConfirmActionButton
                        label={t('admin.finance.confirmCollection')}
                        confirmMessage={t('admin.finance.confirmCollectionMessage')}
                        path={endpoints.admin.financePaymentCollectionConfirm(id)}
                        onSuccess={() => state.reload()}
                      />
                    )}
                    {canCancelPayments(user) && status === 'draft' && (
                      <ConfirmActionButton
                        label={t('admin.finance.cancelCollection')}
                        confirmMessage={t('admin.finance.cancelCollectionMessage')}
                        path={endpoints.admin.financePaymentCollectionCancel(id)}
                        onSuccess={() => state.reload()}
                      />
                    )}
                  </div>
                ) : undefined
              }
            />

            {readOnly && (
              <p className="muted finance-readonly-note">{t('admin.finance.collectionReadOnly')}</p>
            )}

            <div className="card">
              <dl className="detail-list">
                <div>
                  <dt>{t('academic.status')}</dt>
                  <dd>
                    <FinanceStatusBadge state={collectionState(coll)} />
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.finance.collectionAmount')}</dt>
                  <dd>
                    <FinanceMoney amount={coll.amount ?? coll.total_amount} />
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.finance.paymentMethod')}</dt>
                  <dd>{coll.payment_method ?? t('common.dash')}</dd>
                </div>
                <div>
                  <dt>{t('admin.finance.collectionDate')}</dt>
                  <dd>{formatDate(coll.collection_date ?? coll.date) || t('common.dash')}</dd>
                </div>
                {coll.payer_name && (
                  <div>
                    <dt>{t('admin.finance.payer')}</dt>
                    <dd>{coll.payer_name}</dd>
                  </div>
                )}
                {coll.notes && (
                  <div>
                    <dt>{t('common.note')}</dt>
                    <dd>{coll.notes}</dd>
                  </div>
                )}
              </dl>
            </div>

            {(coll.allocations?.length ?? 0) > 0 && (
              <section className="card">
                <h3>{t('admin.finance.allocations')}</h3>
                <DataTable
                  columns={allocationColumns}
                  rows={coll.allocations ?? []}
                  rowKey={(row) => row.id ?? `${row.student_fee_id}-${row.installment_id}-${row.amount}`}
                />
              </section>
            )}

            {(coll.status_history?.length ?? 0) > 0 && (
              <section className="card">
                <h3>{t('admin.finance.statusHistory')}</h3>
                <ul className="finance-status-history">
                  {coll.status_history?.map((entry, idx) => (
                    <li key={idx}>
                      <FinanceStatusBadge state={entry.state ?? 'draft'} />
                      {' · '}
                      {formatDateTime(entry.date) || t('common.dash')}
                      {entry.user?.name ? ` · ${entry.user.name}` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
