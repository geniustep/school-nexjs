'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { CollectionReceiptSection } from '@/features/admin/finance/collection-receipt-section';
import { CollectionStudentCell } from '@/features/admin/finance/collection-student-cell';
import {
  buildCollectionDetailTitle,
  buildCollectionStatusBannerKey,
  buildCollectionTimeline,
  extractChequeReviewFields,
  getCollectionAcademicYearLabel,
  getCollectionAllocatedAmount,
  getCollectionBillingEntityLabel,
  getCollectionBillingPartyType,
  getCollectionCommercialReference,
  getCollectionJournalDisplayLabel,
  getCollectionPayerLabel,
  getCollectionReceiptLabel,
  getCollectionStudentCode,
  getCollectionUnallocatedAmount,
  resolveCollectionReviewActions,
  resolveStudentUnavailableReason,
} from '@/features/admin/finance/collection-detail-review';
import { formatAllocationRowDetails } from '@/features/admin/finance/collection-normalize';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { billingPartyTypeLabelKey } from '@/features/admin/finance/fee-plans/fee-plan-pricing';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { canCancelPayments, canCollectPayments } from '@/lib/permissions/finance';
import { isCollectionChequeReversed, isChequePayment } from '@/lib/utils/cheque';
import { collectionState, paymentMethodLabel } from '@/lib/utils/finance';
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

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="collection-review-summary__row">
      <span className="collection-review-summary__label">{label}</span>
      <span className="collection-review-summary__value">{children}</span>
    </div>
  );
}

function DisabledActionHint({ reasonKey, t }: { reasonKey: string; t: (key: string) => string }) {
  return (
    <p className="tiny muted collection-review-actions__hint" title={t(reasonKey)}>
      {t(reasonKey)}
    </p>
  );
}

function AllocationCard({
  row,
  currency,
  t,
  locale,
}: {
  row: PaymentAllocation;
  currency?: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: string;
}) {
  const details = formatAllocationRowDetails(row, t, locale);
  return (
    <article className="collection-review-allocation-card">
      <div className="collection-review-allocation-card__main">
        <h3 className="collection-review-allocation-card__title" dir="auto">
          {details.title}
        </h3>
        {details.subtitle ? (
          <p className="tiny muted collection-review-allocation-card__subtitle" dir="auto">
            {details.subtitle}
          </p>
        ) : null}
      </div>
      <div className="collection-review-allocation-card__amount">
        <FinanceMoney amount={row.amount} currency={currency} />
      </div>
      {details.internalId ? (
        <span className="tiny muted collection-review-allocation-card__id" title={details.internalId}>
          #{details.internalId}
        </span>
      ) : null}
    </article>
  );
}

export function CollectionDetailsSkeleton() {
  return (
    <div className="collection-details collection-details--loading" aria-busy="true">
      <div className="collection-details__skeleton collection-details__skeleton--title" />
      <div className="collection-details__skeleton collection-details__skeleton--subtitle" />
      <div className="collection-details__layout">
        <div className="collection-details__skeleton collection-details__skeleton--card" />
        <div className="collection-details__skeleton collection-details__skeleton--aside" />
      </div>
    </div>
  );
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
  const { locale } = useLocale();
  const user = useSession();
  const { formatDate, formatDateTime } = useFormat();
  const { academicYears } = useFinanceReferenceData();
  const [copied, setCopied] = useState(false);

  const coll = state.data;
  const status = coll ? collectionState(coll) || 'draft' : 'draft';
  const commercialRef = coll ? getCollectionCommercialReference(coll) : null;
  const studentId = coll?.student_id ?? coll?.student?.id ?? null;
  const studentCode = coll ? getCollectionStudentCode(coll) : null;
  const studentUnavailableReason = coll ? resolveStudentUnavailableReason(coll) : null;
  const isCheque = coll ? isChequePayment(coll.payment_method) || !!coll.cheque : false;
  const chequeId = coll?.cheque?.id ?? coll?.cheque_id ?? null;
  const chequeReversed = coll ? isCollectionChequeReversed(coll) : false;

  const title = useMemo(
    () => (coll ? buildCollectionDetailTitle(coll, t, locale) : null),
    [coll, t, locale],
  );

  const reviewActions = useMemo(
    () =>
      coll
        ? resolveCollectionReviewActions(coll, {
            canCollect: canCollectPayments(user),
            canCancel: canCancelPayments(user),
            t,
          })
        : null,
    [coll, user, t],
  );

  const timeline = useMemo(() => (coll ? buildCollectionTimeline(coll) : []), [coll]);
  const chequeFields = useMemo(
    () => (coll?.cheque ? extractChequeReviewFields(coll.cheque, formatDate, t) : []),
    [coll?.cheque, formatDate, t],
  );

  const allocatedAmount = coll ? getCollectionAllocatedAmount(coll) : null;
  const unallocatedAmount = coll ? getCollectionUnallocatedAmount(coll) : null;
  const allocationCount = coll?.allocation_count ?? coll?.allocations?.length ?? 0;
  const academicYearLabel = coll ? getCollectionAcademicYearLabel(coll, academicYears) : null;
  const billingPartyType = coll ? getCollectionBillingPartyType(coll) : null;
  const journalLabel = coll ? getCollectionJournalDisplayLabel(coll, t) : null;

  if (!coll || !title || !reviewActions) return null;

  const copyValue = commercialRef ?? String(coll.id);
  const copyLabel = commercialRef
    ? t('admin.finance.collections.copyReference')
    : t('admin.finance.collections.detail.copyInternalId');

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const statusBannerKey = buildCollectionStatusBannerKey(coll);
  const statusBannerHintKey = `${statusBannerKey}Hint`;

  return (
    <div className="collection-details">
      <header className="collection-details__header">
        <div className="collection-details__header-main">
          <h1 className="collection-details__title">{title.primary}</h1>
          <p className="collection-details__subtitle" dir="auto">
            {title.secondary}
          </p>
          <dl className="collection-details__identifiers">
            <div>
              <dt>{t('admin.finance.collections.detail.internalId')}</dt>
              <dd className="mono">{coll.id}</dd>
            </div>
            <div>
              <dt>{t('admin.finance.collections.detail.collectionReference')}</dt>
              <dd dir="auto">{commercialRef ?? t('common.dash')}</dd>
            </div>
            {isCheque && coll.cheque?.cheque_number ? (
              <div>
                <dt>{t('admin.finance.cheques.number')}</dt>
                <dd className="mono" dir="auto">
                  {coll.cheque.cheque_number}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>{t('admin.finance.receipts.fields.number')}</dt>
              <dd dir="auto">{getCollectionReceiptLabel(coll, t)}</dd>
            </div>
          </dl>
          <div className="collection-details__meta">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void copyReference()}>
              {copied ? t('admin.finance.collections.copied') : copyLabel}
            </button>
            <span className="muted tiny">
              {formatDate(coll.collection_date ?? coll.date ?? coll.payment_date) || t('admin.finance.unavailable')}
            </span>
          </div>
        </div>
      </header>

      <div className="collection-details__status-banner" role="status">
        <p>{t(statusBannerKey)}</p>
        {t(statusBannerHintKey) !== statusBannerHintKey ? (
          <p className="tiny muted">{t(statusBannerHintKey)}</p>
        ) : null}
      </div>

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

      <div className="collection-details__layout">
        <div className="collection-details__main">
          <section className="card collection-details__section">
            <h2>{t('admin.finance.collections.drawerPartiesSection')}</h2>
            <dl className="finance-detail-fields">
              <DetailField label={t('nav.students')}>
                {studentUnavailableReason ? (
                  <span className="muted" dir="auto">
                    {t(studentUnavailableReason)}
                  </span>
                ) : (
                  <CollectionStudentCell
                    student={coll.student}
                    studentId={studentId}
                    studentName={coll.student_name}
                    code={studentCode}
                    returnTo={returnTo}
                    unavailableLabel={t('admin.finance.unavailable')}
                  />
                )}
              </DetailField>
              <DetailField label={t('admin.finance.collections.detail.registrationNumber')} hideWhenEmpty>
                {studentCode ? <span className="mono" dir="auto">{studentCode}</span> : null}
              </DetailField>
              <DetailField label={t('admin.finance.collections.columns.payer')}>
                <span dir="auto">{getCollectionPayerLabel(coll, t('admin.finance.unavailable'))}</span>
              </DetailField>
              <DetailField label={t('admin.finance.billingPartner')}>
                <span dir="auto">
                  {getCollectionBillingEntityLabel(coll) ?? t('admin.finance.unavailable')}
                </span>
              </DetailField>
              <DetailField label={t('admin.finance.billingPartyTitle')} hideWhenEmpty>
                {billingPartyType ? (
                  <span dir="auto">{t(billingPartyTypeLabelKey(billingPartyType))}</span>
                ) : null}
              </DetailField>
              <DetailField label={t('admin.finance.paymentMethod')}>
                {paymentMethodLabel(coll.payment_method, t)}
              </DetailField>
              <DetailField label={t('admin.finance.paymentJournal')} hideWhenEmpty>
                {journalLabel ? <span dir="auto">{journalLabel}</span> : null}
              </DetailField>
            </dl>
          </section>

          {isCheque ? (
            <section className="card collection-details__section">
              <h2>{t('admin.finance.collections.detail.chequeSection')}</h2>
              {chequeFields.length > 0 ? (
                <dl className="finance-detail-fields">
                  {chequeFields.map((field) => (
                    <DetailField key={field.label} label={field.label}>
                      <span dir="auto">{field.value}</span>
                    </DetailField>
                  ))}
                </dl>
              ) : (
                <p className="muted">{t('admin.finance.collections.detail.chequeDraftPending')}</p>
              )}
              {chequeId ? (
                <Link
                  href={appendReturnTo(`/admin/finance/cheques/${chequeId}`, returnTo)}
                  className="btn btn--ghost btn--sm collection-details__inline-action"
                >
                  {t('admin.finance.collections.openLinkedCheque')}
                </Link>
              ) : null}
            </section>
          ) : null}

          <section className="card collection-details__section">
            <h2>{t('admin.finance.allocations')}</h2>
            {(coll.allocations?.length ?? 0) > 0 ? (
              <>
                <div className="collection-review-allocations">
                  {coll.allocations?.map((row) => (
                    <AllocationCard
                      key={row.id ?? `${row.student_fee_id}-${row.installment_id}-${row.amount}`}
                      row={row}
                      currency={coll.currency}
                      t={t}
                      locale={locale}
                    />
                  ))}
                </div>
                <div className="collection-review-allocations__totals">
                  <span>
                    {t('admin.finance.collections.detail.allocatedTotal')}:{' '}
                    <FinanceMoney amount={allocatedAmount} currency={coll.currency} />
                  </span>
                  <span>
                    {t('admin.finance.collections.detail.unallocatedTotal')}:{' '}
                    <FinanceMoney amount={unallocatedAmount} currency={coll.currency} />
                  </span>
                </div>
              </>
            ) : (
              <p className="muted">{t('admin.finance.collections.noAllocations')}</p>
            )}
          </section>

          <CollectionReceiptSection collection={coll} onChanged={() => state.reload()} returnTo={returnTo} />

          {timeline.length > 0 ? (
            <section className="card collection-details__section">
              <h2>{t('admin.finance.collections.detail.timelineTitle')}</h2>
              <ol className="collection-review-timeline">
                {timeline.map((event) => (
                  <li key={`${event.key}-${event.date ?? 'na'}`}>
                    <span>{t(event.labelKey)}</span>
                    {event.date ? (
                      <span className="tiny muted">{formatDateTime(event.date)}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="collection-details__aside">
          <section className="card collection-review-summary">
            <h2>{t('admin.finance.collections.detail.summaryTitle')}</h2>
            <SummaryRow label={t('admin.finance.collectionAmount')}>
              <FinanceMoney amount={coll.amount ?? coll.total_amount} currency={coll.currency} />
            </SummaryRow>
            <SummaryRow label={t('admin.finance.collections.detail.allocatedAmount')}>
              <FinanceMoney amount={allocatedAmount} currency={coll.currency} />
            </SummaryRow>
            <SummaryRow label={t('admin.finance.collections.detail.unallocatedAmount')}>
              <FinanceMoney amount={unallocatedAmount} currency={coll.currency} />
            </SummaryRow>
            <SummaryRow label={t('admin.finance.collections.detail.receivableCount')}>
              {allocationCount}
            </SummaryRow>
            <SummaryRow label={t('admin.finance.paymentMethod')}>
              {paymentMethodLabel(coll.payment_method, t)}
            </SummaryRow>
            <SummaryRow label={t('academic.status')}>
              <FinanceStatusBadge state={status} />
            </SummaryRow>
            <SummaryRow label={t('admin.finance.academicYear')}>
              {academicYearLabel ?? t('common.dash')}
            </SummaryRow>
            <SummaryRow label={t('admin.finance.receipts.sectionTitle')}>
              <span dir="auto">{getCollectionReceiptLabel(coll, t)}</span>
            </SummaryRow>
          </section>

          <section className="card collection-review-actions">
            <h2>{t('admin.finance.collections.detail.actionsTitle')}</h2>
            <div className="collection-review-actions__stack">
              {reviewActions.canConfirm ? (
                <ConfirmActionButton
                  label={t('admin.finance.confirmCollection')}
                  confirmMessage={t('admin.finance.collections.detail.confirmMessage')}
                  confirmTitle={t('admin.finance.confirmCollection')}
                  path={endpoints.admin.financePaymentCollectionConfirm(collectionId)}
                  variant="primary"
                  onSuccess={() => state.reload()}
                />
              ) : reviewActions.confirmDisabledReason ? (
                <div className="collection-review-actions__disabled">
                  <button type="button" className="btn btn--primary btn--sm" disabled>
                    {t('admin.finance.confirmCollection')}
                  </button>
                  <DisabledActionHint reasonKey={reviewActions.confirmDisabledReason} t={t} />
                </div>
              ) : null}

              {studentId ? (
                <Link
                  href={buildFinanceStudentProfileLink(studentId, returnTo)}
                  className="btn btn--ghost btn--sm"
                  prefetch={false}
                >
                  {t('admin.finance.collections.detail.openStudentFinanceProfile')}
                </Link>
              ) : null}

              {reviewActions.canCancel ? (
                <ConfirmActionButton
                  label={t('admin.finance.collections.detail.cancelDraft')}
                  confirmMessage={t('admin.finance.collections.detail.cancelDraftMessage')}
                  confirmTitle={t('admin.finance.collections.detail.cancelDraft')}
                  path={endpoints.admin.financePaymentCollectionCancel(collectionId)}
                  variant="danger"
                  onSuccess={() => state.reload()}
                />
              ) : reviewActions.cancelDisabledReason && status === 'draft' ? (
                <div className="collection-review-actions__disabled">
                  <button type="button" className="btn btn--sm" disabled>
                    {t('admin.finance.collections.detail.cancelDraft')}
                  </button>
                  <DisabledActionHint reasonKey={reviewActions.cancelDisabledReason} t={t} />
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function resolveCollectionBackLabel(returnTo: string, t: (key: string) => string): string {
  if (/\/admin\/finance\/cheques\/\d+/.test(returnTo)) {
    return t('admin.finance.collections.backToChequeDetails');
  }
  if (returnTo.includes('/admin/finance/cheques')) return t('admin.finance.cheques.backToList');
  if (returnTo.includes('/students/')) return t('common.back');
  if (returnTo === '/admin/finance') return t('admin.finance.backToFinance');
  return t('admin.finance.backToCollections');
}
