'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { CollectionStudentCell } from '@/features/admin/finance/collection-student-cell';
import { formatAllocationRowLabel } from '@/features/admin/finance/collection-labels';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { ChequePaymentMarker } from '@/features/admin/finance/cheque-payment-marker';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_PAYMENTS, canCancelPayments, canCollectPayments } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import { collectionState, paymentMethodLabel, refName } from '@/lib/utils/finance';
import { isCollectionChequeReversed, isChequePayment } from '@/lib/utils/cheque';
import type { PaymentAllocation, PaymentCollection } from '@/types/finance';
import '@/features/admin/finance/finance-ui.css';

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
  const [copied, setCopied] = useState(false);
  const status = state.data ? collectionState(state.data) : 'draft';
  const readOnly = status === 'confirmed' || status === 'cancelled';

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

  async function copyReference(ref: string) {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href="/admin/finance/collections" className="back-link">
        ‹ {t('admin.finance.backToCollections')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(coll) => {
          const ref = coll.reference ?? coll.name ?? `#${coll.id}`;
          return (
            <>
              <PageHeader
                title={t('admin.finance.collections.detailTitleAmount', {
                  amount: String(coll.amount ?? coll.total_amount ?? 0),
                  currency: coll.currency ?? 'MAD',
                })}
                subtitle={`${t('admin.finance.reference')}: ${ref}`}
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

              <p className="collection-detail-ref">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => void copyReference(ref)}
                >
                  {copied ? t('admin.finance.collections.copied') : t('admin.finance.collections.copyReference')}
                </button>
              </p>

              <div className="collection-detail-status-bar">
                <FinanceStatusBadge state={collectionState(coll) || 'unknown'} />
                <span>{formatDate(coll.collection_date ?? coll.date)}</span>
                <span>{paymentMethodLabel(coll.payment_method, t)}</span>
                <CollectionStudentCell
                  student={coll.student}
                  studentId={coll.student_id}
                  unavailableLabel={t('admin.finance.unavailable')}
                />
                <span>{coll.payer_name ?? refName(coll.billing_partner) ?? t('admin.finance.unavailable')}</span>
              </div>

              {readOnly && (
                <p className="muted finance-readonly-note">{t('admin.finance.collectionReadOnly')}</p>
              )}

              {(isChequePayment(coll.payment_method) || coll.cheque) && (
                <section className="collection-detail-section">
                  <h3>{t('admin.finance.cheques.title')}</h3>
                  <ChequePaymentMarker collection={coll} />
                  {isCollectionChequeReversed(coll) && (
                    <p className="finance-cheque-reversal-note">{t('admin.finance.cheques.collectionReversed')}</p>
                  )}
                </section>
              )}

              <section className="collection-detail-section">
                <h3>{t('admin.finance.collections.detailPaymentSection')}</h3>
                <dl className="detail-list detail-list--compact">
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
                    <dt>{t('admin.finance.collectionDate')}</dt>
                    <dd>{formatDate(coll.collection_date ?? coll.date) || t('common.dash')}</dd>
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
                  {coll.notes ? (
                    <div>
                      <dt>{t('common.note')}</dt>
                      <dd>{coll.notes}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="collection-detail-section">
                <h3>{t('admin.finance.collections.drawerPartiesSection')}</h3>
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
                    <dd>{coll.payer_name ?? t('admin.finance.unavailable')}</dd>
                  </div>
                </dl>
              </section>

              <section className="collection-detail-section">
                <h3>{t('admin.finance.allocations')}</h3>
                {(coll.allocations?.length ?? 0) > 0 ? (
                  <DataTable
                    columns={allocationColumns}
                    rows={coll.allocations ?? []}
                    rowKey={(row) => row.id ?? `${row.student_fee_id}-${row.installment_id}-${row.amount}`}
                  />
                ) : (
                  <p className="muted">{t('admin.finance.collections.noAllocations')}</p>
                )}
              </section>

              {(coll.status_history?.length ?? 0) > 0 && (
                <section className="collection-detail-section">
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
          );
        }}
      </ResourceView>
    </RequireAdminPermission>
  );
}
