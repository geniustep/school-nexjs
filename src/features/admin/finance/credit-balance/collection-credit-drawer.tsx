'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { LoadingState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { ApplyCreditDrawer } from '@/features/admin/finance/credit-balance/apply-credit-drawer';
import {
  BlockReasonLabel,
  CreditBalanceStatusBadge,
  SettlementStatusLabel,
} from '@/features/admin/finance/credit-balance/credit-balance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  canShowApplyCreditButton,
  creditBalanceErrorMessageKey,
  deriveCreditLifecycleState,
  normalizeCollectionCreditDetail,
} from '@/lib/utils/normalize-credit-balance';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { CreditBalanceApplication } from '@/types/finance-credit-balance';

export function CollectionCreditDrawer({
  open,
  collectionId,
  returnTo,
  onClose,
  onApplied,
}: {
  open: boolean;
  collectionId: number | null;
  returnTo: string;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const [applyOpen, setApplyOpen] = useState(false);

  const state = useAdminResource<unknown>(
    open && collectionId ? endpoints.admin.financePaymentCollectionCredit(collectionId) : null,
  );
  const detail = useMemo(() => normalizeCollectionCreditDetail(state.data), [state.data]);

  const applicationColumns: Column<CreditBalanceApplication>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('nav.students'),
        render: (row) => <span dir="auto">{row.student_name ?? t('common.dash')}</span>,
      },
      {
        key: 'service',
        header: t('admin.finance.collections.columns.service'),
        render: (row) => <span dir="auto">{row.service_name ?? t('common.dash')}</span>,
      },
      {
        key: 'amount',
        header: t('admin.finance.allocationAmount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={detail?.currency} />,
      },
      {
        key: 'date',
        header: t('common.date'),
        render: (row) => (row.date ? formatDate(row.date) : t('common.dash')),
      },
    ],
    [t, formatDate, detail?.currency],
  );

  if (!open || !collectionId) return null;

  const showApply = detail ? canShowApplyCreditButton(detail) : false;

  return (
    <>
      <SetupDrawer
        open={open}
        title={t('admin.finance.creditBalances.sourceDrawerTitle', {
          id: String(collectionId),
        })}
        onClose={onClose}
        size="wide"
      >
        {state.loading && !detail ? <LoadingState label={t('common.loading')} /> : null}
        {state.error ? (
          <p className="form-error">{t(creditBalanceErrorMessageKey(state.error.code))}</p>
        ) : null}
        {detail ? (
          <div className="form-stack finance-collection-credit-drawer">
            <div className="finance-credit-drawer-hero">
              <FinanceMoney amount={detail.amount} currency={detail.currency} />
              <CreditBalanceStatusBadge
                state={detail.lifecycle_state ?? deriveCreditLifecycleState(detail)}
              />
            </div>

            <section className="collection-drawer-section">
              <h4>{t('admin.finance.creditBalances.sourceSummary')}</h4>
              <dl className="detail-list detail-list--compact">
                <div>
                  <dt>{t('admin.finance.creditBalances.sources.collection')}</dt>
                  <dd className="mono">#{detail.collection_id}</dd>
                </div>
                <div>
                  <dt>{t('admin.finance.creditBalances.sources.receipt')}</dt>
                  <dd className="mono">{detail.receipt_number ?? t('common.dash')}</dd>
                </div>
                <div>
                  <dt>{t('common.date')}</dt>
                  <dd>{detail.payment_date ? formatDate(detail.payment_date) : t('common.dash')}</dd>
                </div>
                <div>
                  <dt>{t('admin.finance.paymentMethod')}</dt>
                  <dd>{paymentMethodLabel(detail.payment_method, t)}</dd>
                </div>
                <div>
                  <dt>{t('admin.finance.creditBalances.sources.allocated')}</dt>
                  <dd>
                    <FinanceMoney amount={detail.allocated_amount} currency={detail.currency} />
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.finance.creditBalances.sources.unallocated')}</dt>
                  <dd>
                    <FinanceMoney amount={detail.unallocated_amount} currency={detail.currency} />
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.finance.creditBalances.sources.settlement')}</dt>
                  <dd>
                    <SettlementStatusLabel code={detail.settlement_status} />
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.finance.creditBalances.metrics.available')}</dt>
                  <dd>
                    <FinanceMoney
                      amount={detail.available_credit_amount}
                      currency={detail.currency}
                    />
                  </dd>
                </div>
                <div>
                  <dt>{t('admin.finance.creditBalances.metrics.blocked')}</dt>
                  <dd>
                    <FinanceMoney
                      amount={detail.blocked_unallocated_amount}
                      currency={detail.currency}
                    />
                  </dd>
                </div>
                {detail.block_reason ? (
                  <div>
                    <dt>{t('admin.finance.creditBalances.sources.blockReason')}</dt>
                    <dd>
                      <BlockReasonLabel code={detail.block_reason} />
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="collection-drawer-section">
              <h4>{t('admin.finance.creditBalances.applicationsTitle')}</h4>
              {(detail.applications?.length ?? 0) > 0 ? (
                <DataTable
                  columns={applicationColumns}
                  rows={detail.applications ?? []}
                  rowKey={(row) =>
                    String(row.id ?? `${row.installment_id ?? 0}-${row.amount ?? 0}`)
                  }
                />
              ) : (
                <p className="muted">{t('admin.finance.creditBalances.noApplications')}</p>
              )}
            </section>

            <div className="collection-drawer-actions">
              <Link
                href={`/admin/finance/collections/${detail.collection_id}?returnTo=${encodeURIComponent(returnTo)}`}
                className="btn btn--ghost btn--sm"
              >
                {t('admin.finance.creditBalances.openCollection')}
              </Link>
              {detail.receipt_id ? (
                <Link
                  href={`/admin/finance/receipts/${detail.receipt_id}?returnTo=${encodeURIComponent(returnTo)}`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.finance.creditBalances.openReceipt')}
                </Link>
              ) : null}
              {detail.cheque_id ? (
                <Link
                  href={`/admin/finance/cheques?search=${detail.cheque_id}&returnTo=${encodeURIComponent(returnTo)}`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.finance.creditBalances.openCheque')}
                </Link>
              ) : null}
              {showApply ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setApplyOpen(true)}
                >
                  {t('admin.finance.creditBalances.applyCredit')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </SetupDrawer>

      {detail ? (
        <ApplyCreditDrawer
          open={applyOpen}
          collectionId={detail.collection_id}
          billingPartnerId={detail.billing_partner_id ?? null}
          availableAmount={detail.available_credit_amount ?? 0}
          currency={detail.currency}
          receiptNumber={detail.receipt_number}
          paymentMethod={detail.payment_method}
          onClose={() => setApplyOpen(false)}
          onSuccess={() => {
            setApplyOpen(false);
            state.reload();
            onApplied?.();
          }}
        />
      ) : null}
    </>
  );
}
