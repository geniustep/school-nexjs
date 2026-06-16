'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/tables/data-table';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { CollectionReceiptSection } from '@/features/admin/finance/collection-receipt-section';
import { CollectionStudentCell } from '@/features/admin/finance/collection-student-cell';
import { formatAllocationRowLabel } from '@/features/admin/finance/collection-labels';
import {
  getCollectionBillingEntityLabel,
  getCollectionJournalLabel,
  getCollectionPayerLabel,
  normalizePaymentCollection,
} from '@/features/admin/finance/collection-normalize';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { canCancelPayments, canCollectPayments } from '@/lib/permissions/finance';
import { isCollectionChequeReversed, isChequePayment } from '@/lib/utils/cheque';
import { collectionState, formatMoney, paymentMethodLabel } from '@/lib/utils/finance';
import { buildFinanceStudentProfileLink } from '@/lib/utils/finance-navigation';
import { appendReturnTo } from '@/lib/utils/safe-return-url';
import type { PaymentAllocation, PaymentCollection } from '@/types/finance';
import type { ResourceState } from '@/lib/hooks/use-resource';

function DetailField({
  label,
  children,
  hideWhenEmpty,
}: {
  label: string;
  children: ReactNode;
  hideWhenEmpty?: boolean;
}) {
  if (hideWhenEmpty && (children == null || children === false || children === '')) return null;
  return (
    <div className="finance-detail-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function isChequeDetailPath(path: string): boolean {
  return /\/admin\/finance\/cheques\/\d+/.test(path);
}

export function CollectionDetailsView({
  state,
  collectionId,
  returnTo,
}: {
  state: ResourceState<PaymentCollection>;
  collectionId: string;
  returnTo: string;
}) {
  const t = useT();
  const user = useSession();
  const { formatDate, formatDateTime } = useFormat();
  const [copied, setCopied] = useState(false);

  const coll = state.data;
  const detail = useMemo(
    () => (coll ? normalizePaymentCollection(coll, t('admin.finance.unavailable')) : null),
    [coll, t],
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
        render: (row) => <FinanceMoney amount={row.amount} currency={coll?.currency} />,
      },
    ],
    [t, coll?.currency],
  );

  if (!coll || !detail) return null;

  const status = collectionState(coll) || 'draft';
  const readOnly = status === 'confirmed' || status === 'cancelled';
  const ref = detail.reference;
  const chequeId = coll.cheque?.id ?? null;
  const chequeReversed = isCollectionChequeReversed(coll);
  const isCheque = isChequePayment(coll.payment_method) || !!coll.cheque;
  const titleAmount = formatMoney(detail.amount, coll.currency);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="collection-details">
      <header className="collection-details__header">
        <div className="collection-details__header-main">
          <h1 className="collection-details__title">
            {t('admin.finance.collections.detailTitleAmount', { amount: titleAmount })}
          </h1>
          <p className="collection-details__subtitle">
            <span>{t('admin.finance.reference')}: </span>
            <span className="mono finance-detail-ref-value" dir="auto" title={ref}>
              {ref}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void copyReference()}>
              {copied ? t('admin.finance.collections.copied') : t('admin.finance.collections.copyReference')}
            </button>
          </p>
          <div className="collection-details__meta">
            <FinanceStatusBadge state={status} />
            <span>{formatDate(detail.date) || t('admin.finance.unavailable')}</span>
            <span>{paymentMethodLabel(coll.payment_method, t)}</span>
          </div>
        </div>
      </header>

      <div className="collection-details__action-bar">
        {chequeId ? (
          <Link
            href={appendReturnTo(`/admin/finance/cheques/${chequeId}`, returnTo)}
            className="btn btn--primary btn--sm"
          >
            {t('admin.finance.collections.openLinkedCheque')}
          </Link>
        ) : null}
        {detail.studentId ? (
          <Link
            href={buildFinanceStudentProfileLink(detail.studentId, returnTo)}
            className="btn btn--ghost btn--sm"
            prefetch={false}
          >
            {t('admin.finance.collections.openStudentProfile')}
          </Link>
        ) : null}
        {!readOnly && canCollectPayments(user) && status === 'draft' ? (
          <ConfirmActionButton
            label={t('admin.finance.confirmCollection')}
            confirmMessage={t('admin.finance.confirmCollectionMessage')}
            path={endpoints.admin.financePaymentCollectionConfirm(collectionId)}
            onSuccess={() => state.reload()}
          />
        ) : null}
        {!readOnly && canCancelPayments(user) && status === 'draft' ? (
          <ConfirmActionButton
            label={t('admin.finance.cancelCollection')}
            confirmMessage={t('admin.finance.cancelCollectionMessage')}
            path={endpoints.admin.financePaymentCollectionCancel(collectionId)}
            onSuccess={() => state.reload()}
          />
        ) : null}
      </div>

      {readOnly ? (
        <p className="muted finance-readonly-note">{t('admin.finance.collectionReadOnly')}</p>
      ) : null}

      {chequeReversed && isCheque ? (
        <div className="collection-details__alert" role="alert">
          <p>{t('admin.finance.collections.reversedByChequeAlert')}</p>
          {chequeId ? (
            <Link
              href={appendReturnTo(`/admin/finance/cheques/${chequeId}`, returnTo)}
              className="btn btn--ghost btn--sm"
            >
              {t('admin.finance.collections.openLinkedCheque')}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="collection-details__grid">
        <section className="card collection-details__section">
          <h2>{t('admin.finance.collections.detailPaymentSection')}</h2>
          <dl className="finance-detail-fields">
            <DetailField label={t('admin.finance.collectionAmount')}>
              <FinanceMoney amount={detail.amount} currency={coll.currency} />
            </DetailField>
            <DetailField label={t('common.date')}>
              {formatDate(detail.date) || t('admin.finance.unavailable')}
            </DetailField>
            <DetailField label={t('admin.finance.paymentMethod')}>
              {paymentMethodLabel(coll.payment_method, t)}
            </DetailField>
            <DetailField label={t('admin.finance.paymentJournal')} hideWhenEmpty>
              {getCollectionJournalLabel(coll) ? <span dir="auto">{getCollectionJournalLabel(coll)}</span> : null}
            </DetailField>
            <DetailField label={t('admin.finance.externalReference')} hideWhenEmpty>
              {coll.reference ? <span dir="auto">{coll.reference}</span> : null}
            </DetailField>
            <DetailField label={t('admin.finance.billingPartner')} hideWhenEmpty>
              {getCollectionBillingEntityLabel(coll) ? (
                <span dir="auto">{getCollectionBillingEntityLabel(coll)}</span>
              ) : null}
            </DetailField>
            <DetailField label={t('academic.status')}>
              <FinanceStatusBadge state={status} />
            </DetailField>
            {coll.notes ? (
              <DetailField label={t('common.note')}>
                <span dir="auto">{coll.notes}</span>
              </DetailField>
            ) : null}
          </dl>
        </section>

        <section className="card collection-details__section">
          <h2>{t('admin.finance.collections.drawerPartiesSection')}</h2>
          <dl className="finance-detail-fields">
            <DetailField label={t('nav.students')}>
              <CollectionStudentCell
                student={coll.student}
                studentId={detail.studentId}
                unavailableLabel={t('admin.finance.unavailable')}
              />
            </DetailField>
            <DetailField label={t('admin.finance.collections.columns.payer')}>
              <span dir="auto">{getCollectionPayerLabel(coll, t('admin.finance.unavailable'))}</span>
            </DetailField>
          </dl>

          <h3 className="collection-details__subheading">{t('admin.finance.allocations')}</h3>
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
      </div>

      <CollectionReceiptSection collection={coll} onChanged={() => state.reload()} returnTo={returnTo} />

      {(coll.status_history?.length ?? 0) > 0 ? (
        <section className="card collection-details__section">
          <h2>{t('admin.finance.statusHistory')}</h2>
          <ul className="finance-status-history">
            {coll.status_history?.map((entry, idx) => (
              <li key={idx}>
                <FinanceStatusBadge state={entry.state ?? 'draft'} />
                {' · '}
                {formatDateTime(entry.date) || t('admin.finance.unavailable')}
                {entry.user?.name ? ` · ${entry.user.name}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function resolveCollectionBackLabel(returnTo: string, t: (key: string) => string): string {
  if (isChequeDetailPath(returnTo)) return t('admin.finance.collections.backToChequeDetails');
  if (returnTo.includes('/admin/finance/cheques')) return t('admin.finance.cheques.backToList');
  if (returnTo.includes('/students/')) return t('common.back');
  if (returnTo === '/admin/finance') return t('admin.finance.backToFinance');
  return t('admin.finance.backToCollections');
}
