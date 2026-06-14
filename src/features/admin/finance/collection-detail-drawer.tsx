'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { LoadingState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { CollectionStudentCell } from '@/features/admin/finance/collection-student-cell';
import { formatAllocationRowLabel, truncateReference } from '@/features/admin/finance/collection-labels';
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
        key: 'label',
        header: t('admin.finance.studentFee'),
        render: (row) => formatAllocationRowLabel(row, t),
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
  const ref = coll?.reference ?? coll?.name ?? (coll ? `#${coll.id}` : '');

  return (
    <SetupDrawer open={open} title={t('admin.finance.collectionWorkflow.detailTitle')} onClose={onClose}>
      {state.loading && !coll ? <LoadingState label={t('common.loading')} /> : null}
      {state.error ? <p className="form-error">{state.error.message}</p> : null}
      {coll ? (
        <div className="form-stack finance-collection-detail-drawer">
          <div className="collection-drawer-hero">
            <FinanceMoney amount={coll.amount ?? coll.total_amount} currency={coll.currency} />
            <FinanceStatusBadge state={collectionState(coll) || 'unknown'} />
            <CollectionStudentCell
              student={coll.student}
              studentId={coll.student_id}
              unavailableLabel={t('admin.finance.unavailable')}
            />
            {ref ? (
              <p className="mono tiny muted collection-drawer-hero__ref" title={ref}>
                {t('admin.finance.reference')}: {truncateReference(ref, 40)}
              </p>
            ) : null}
          </div>

          <section className="collection-drawer-section">
            <h4>{t('admin.finance.collections.drawerPaymentSection')}</h4>
            <dl className="detail-list detail-list--compact">
              <div>
                <dt>{t('common.date')}</dt>
                <dd>{formatDate(coll.collection_date ?? coll.date)}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.paymentMethod')}</dt>
                <dd>{paymentMethodLabel(coll.payment_method, t)}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.paymentJournal')}</dt>
                <dd>{coll.journal_id ? `#${coll.journal_id}` : t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.finance.billingPartner')}</dt>
                <dd>{refName(coll.billing_partner) ?? t('common.dash')}</dd>
              </div>
              {coll.reference ? (
                <div>
                  <dt>{t('admin.finance.externalReference')}</dt>
                  <dd>{coll.reference}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="collection-drawer-section">
            <h4>{t('admin.finance.collections.drawerPartiesSection')}</h4>
            <dl className="detail-list detail-list--compact">
              <div>
                <dt>{t('nav.students')}</dt>
                <dd>
                  <CollectionStudentCell
                    student={coll.student}
                    studentId={coll.student_id}
                    unavailableLabel={t('admin.finance.unavailable')}
                  />
                </dd>
              </div>
              <div>
                <dt>{t('admin.finance.collections.columns.payer')}</dt>
                <dd>{coll.payer_name ?? refName(coll.billing_partner) ?? t('admin.finance.unavailable')}</dd>
              </div>
            </dl>
          </section>

          {coll.notes ? (
            <section className="collection-drawer-section">
              <h4>{t('common.note')}</h4>
              <p>{coll.notes}</p>
            </section>
          ) : null}

          {(isChequePayment(coll.payment_method) || coll.cheque) && (
            <section className="collection-drawer-section">
              <h4>{t('admin.finance.cheques.title')}</h4>
              <ChequePaymentMarker collection={coll} />
            </section>
          )}

          <section className="collection-drawer-section">
            <h4>{t('admin.finance.collectionWorkflow.allocationsTitle')}</h4>
            {(coll.allocations?.length ?? 0) > 0 ? (
              <DataTable
                columns={allocationColumns}
                rows={coll.allocations ?? []}
                rowKey={(row) => row.id ?? `${row.student_fee_id ?? 0}-${row.installment_id ?? 0}-${row.amount ?? 0}`}
              />
            ) : (
              <p className="muted">{t('admin.finance.collections.noAllocations')}</p>
            )}
          </section>

          <div className="collection-drawer-actions">
            {coll.student_id ? (
              <Link href={`/admin/students/${coll.student_id}?tab=finance`} className="btn btn--ghost btn--sm">
                {t('admin.finance.collections.openStudentProfile')}
              </Link>
            ) : null}
            <Link href={`/admin/finance/collections/${coll.id}`} className="btn btn--primary btn--sm">
              {t('admin.finance.collectionWorkflow.viewFullDetails')}
            </Link>
          </div>
        </div>
      ) : null}
    </SetupDrawer>
  );
}
