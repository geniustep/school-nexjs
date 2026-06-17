'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ApiErrorView } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { ChequeStatusBadge } from '@/features/admin/finance/cheque-status-badge';
import { ChequeLifecycleDialogs } from '@/features/admin/finance/cheque-lifecycle-host';
import { chequeAllowsAction, resolveChequeLifecycleActions } from '@/features/admin/finance/cheque-allowed-actions';
import { ChequeDetailsSkeleton } from '@/features/admin/finance/cheque-details-skeleton';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import {
  formatCollectionReference,
  getCollectionPayerLabel,
} from '@/features/admin/finance/collection-normalize';
import { normalizeChequeDetail } from '@/features/admin/finance/cheque-normalize';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  canCancelCheques,
  canClearCheques,
  canDepositCheques,
  canRejectCheques,
  canCollectPayments,
} from '@/lib/permissions/finance';
import { availableChequeTransitions } from '@/lib/utils/cheque';
import type { ChequeLifecycleAction } from '@/lib/utils/cheque';
import { isRejectedCheque } from '@/lib/utils/cheque-status';
import { collectionState } from '@/lib/utils/finance';
import { buildFinanceStudentProfileLink } from '@/lib/utils/finance-navigation';
import { appendReturnTo } from '@/lib/utils/safe-return-url';
import type { FinanceCheque, PaymentCollection } from '@/types/finance';
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
    <div className="cheque-details__field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ChequeDetailsActionBar({
  detail,
  chequeSelfPath,
  listReturnTo,
  transitionActions,
  primaryAction,
  canReplace,
  onTransition,
  showReturnNote,
  t,
}: {
  detail: NonNullable<ReturnType<typeof normalizeChequeDetail>>;
  chequeSelfPath: string;
  listReturnTo: string;
  transitionActions: ChequeLifecycleAction[];
  primaryAction: ChequeLifecycleAction | null;
  canReplace: boolean;
  onTransition: (action: ChequeLifecycleAction) => void;
  showReturnNote: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const replaceHref = appendReturnTo(
    detail.studentId
      ? `/admin/finance/collections/new?studentId=${detail.studentId}`
      : '/admin/finance/collections/new',
    chequeSelfPath,
  );
  const collectionHref = detail.collectionId
    ? appendReturnTo(`/admin/finance/collections/${detail.collectionId}`, chequeSelfPath)
    : null;
  const studentHref = detail.studentId
    ? buildFinanceStudentProfileLink(detail.studentId, chequeSelfPath)
    : null;

  const secondaryActions = (
    <>
      {transitionActions
        .filter((action) => action !== primaryAction)
        .map((action) => (
          <button
            key={action}
            type="button"
            className={
              action === 'reject'
                ? 'btn btn--danger btn--sm'
                : action === 'cancel'
                  ? 'btn btn--sm'
                  : 'btn btn--ghost btn--sm'
            }
            onClick={() => onTransition(action)}
          >
            {t(
              action === 'settle'
                ? 'admin.finance.cheques.lifecycle.settleCheque'
                : action === 'reject'
                  ? 'admin.finance.cheques.lifecycle.rejectCheque'
                  : `admin.finance.cheques.actions.${action}.button`,
            )}
          </button>
        ))}
      {collectionHref ? (
        <Link href={collectionHref} className="btn btn--ghost btn--sm" prefetch={false}>
          {t('admin.finance.cheques.details.openCollection')}
        </Link>
      ) : null}
      {studentHref ? (
        <Link href={studentHref} className="btn btn--ghost btn--sm" prefetch={false}>
          {t('admin.finance.collections.openStudentProfile')}
        </Link>
      ) : null}
      <Link href={listReturnTo} className="btn btn--ghost btn--sm" prefetch={false}>
        {t('admin.finance.cheques.backToList')}
      </Link>
    </>
  );

  return (
    <div className="cheque-details__action-bar">
      <div className="cheque-details__action-bar-primary">
        {primaryAction === 'settle' ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onTransition('settle')}>
            {t('admin.finance.cheques.lifecycle.settleCheque')}
          </button>
        ) : primaryAction === 'reject' ? (
          <button type="button" className="btn btn--danger btn--sm" onClick={() => onTransition('reject')}>
            {t('admin.finance.cheques.lifecycle.rejectCheque')}
          </button>
        ) : null}
        {canReplace ? (
          <Link href={replaceHref} className="btn btn--primary btn--sm" prefetch={false}>
            {t('admin.finance.cheques.details.replaceCollection')}
          </Link>
        ) : null}
      </div>
      <div className="cheque-details__action-bar-secondary cheque-details__action-bar-secondary--desktop">
        {secondaryActions}
      </div>
      <details className="cheque-details__more cheque-details__action-bar-secondary--mobile">
        <summary className="btn btn--ghost btn--sm">{t('admin.finance.details.moreActions')}</summary>
        <div className="cheque-details__more-menu">
          {secondaryActions}
          {showReturnNote ? (
            <p className="tiny muted">{t('admin.finance.details.actionUnavailable')}</p>
          ) : null}
        </div>
      </details>
    </div>
  );
}

export function ChequeDetailsView({
  state,
  returnTo,
  chequeSelfPath,
}: {
  state: ResourceState<FinanceCheque>;
  returnTo: string;
  chequeSelfPath: string;
}) {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const { formatDate } = useFormat();
  const [dialogAction, setDialogAction] = useState<ChequeLifecycleAction | null>(null);

  const cheque = state.data;
  const detail = useMemo(() => (cheque ? normalizeChequeDetail(cheque) : null), [cheque]);

  const collectionStateRes = useAdminResource<PaymentCollection>(
    detail?.collectionId ? endpoints.admin.financePaymentCollection(detail.collectionId) : null,
  );
  const collection = collectionStateRes.data;

  if (state.loading && !cheque) {
    return <ChequeDetailsSkeleton />;
  }

  if (state.error) {
    return (
      <div className="cheque-details__error">
        <p className="form-error">{t('admin.finance.cheques.details.loadFailed')}</p>
        <ApiErrorView error={state.error} onRetry={state.reload} />
      </div>
    );
  }

  if (!cheque || !detail) return null;

  function canRun(action: ChequeLifecycleAction): boolean {
    if (!chequeAllowsAction(cheque, action)) return false;
    switch (action) {
      case 'deposit':
        return canDepositCheques(user);
      case 'settle':
        return canClearCheques(user);
      case 'reject':
        return canRejectCheques(user);
      case 'cancel':
        return canCancelCheques(user);
      default:
        return false;
    }
  }

  const lifecycleActions = resolveChequeLifecycleActions(cheque).filter(canRun);
  const fallbackTransitions = availableChequeTransitions(cheque.state ?? 'received').filter(canRun);
  const transitionActions = lifecycleActions.length ? lifecycleActions : fallbackTransitions;
  const primaryAction: ChequeLifecycleAction | null = transitionActions.includes('settle')
    ? 'settle'
    : transitionActions.includes('reject')
      ? 'reject'
      : null;

  function hasLegacyChequeAction(record: FinanceCheque, action: string): boolean {
    const raw = record.allowed_actions;
    if (Array.isArray(raw)) return raw.includes(action);
    if (raw && typeof raw === 'object' && action in raw) {
      const value = (raw as Record<string, unknown>)[action];
      return value === true || (typeof value === 'number' && value > 0);
    }
    return (record.allowed_action_codes ?? []).includes(action);
  }

  const canReplace = hasLegacyChequeAction(cheque, 'replace') && canCollectPayments(user);
  const showReturnNote = hasLegacyChequeAction(cheque, 'return');
  const showReadOnlyNotice = !transitionActions.length && !canReplace && !showReturnNote;

  async function copyNumber() {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.displayNumber);
      toast.success(t('admin.finance.collections.copied'));
    } catch {
      toast.error(t('admin.finance.cheques.details.copyFailed'));
    }
  }

  const titleAmount = (
    <FinanceMoney amount={detail.amount} currency={detail.currency} className="cheque-details__hero-amount" />
  );

  return (
    <div className="cheque-details">
      <nav className="cheque-details__breadcrumb muted" aria-label={t('admin.finance.cheques.details.breadcrumb')}>
        <Link href="/admin/finance" prefetch={false}>{t('admin.finance.hub.title')}</Link>
        <span aria-hidden> / </span>
        <Link href={returnTo} prefetch={false}>{t('admin.finance.cheques.title')}</Link>
        <span aria-hidden> / </span>
        <span>{t('admin.finance.cheques.details.breadcrumbCurrent')}</span>
      </nav>

      <header className="cheque-details__header">
        <div className="cheque-details__header-main">
          <h1 className="cheque-details__title">
            <span>{t(detail.titleKey)} </span>
            {titleAmount}
          </h1>
          <p className="cheque-details__subtitle">
            <span>{t('admin.finance.cheques.details.numberLabel')}: </span>
            <span className="mono" dir="auto" title={detail.displayNumber}>
              {detail.displayNumber}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void copyNumber()}>
              {t('admin.finance.collections.copyReference')}
            </button>
          </p>
        </div>
        {state.loading ? <span className="tiny muted">{t('admin.finance.cheques.details.refreshing')}</span> : null}
      </header>

      <ChequeDetailsActionBar
        detail={detail}
        chequeSelfPath={chequeSelfPath}
        listReturnTo={returnTo}
        transitionActions={transitionActions}
        primaryAction={primaryAction}
        canReplace={canReplace}
        onTransition={setDialogAction}
        showReturnNote={showReturnNote}
        t={t}
      />

      <section className="cheque-details__summary card">
        <div className="cheque-details__summary-grid">
          <div>
            <span className="muted tiny">{t('academic.status')}</span>
            <ChequeStatusBadge
              state={cheque.state ?? 'received'}
              settlementStatus={cheque.settlement_status}
            />
            {detail.stateLabel ? <span className="tiny muted"> ({detail.stateLabel})</span> : null}
          </div>
          <div>
            <span className="muted tiny">{t('admin.finance.collectionAmount')}</span>
            <div><FinanceMoney amount={detail.amount} currency={detail.currency} /></div>
          </div>
          <div>
            <span className="muted tiny">{t('admin.finance.cheques.dueDate')}</span>
            <div>{formatDate(cheque.due_date ?? cheque.maturity_date) || t('admin.finance.unavailable')}</div>
          </div>
          <div>
            <span className="muted tiny">{t('admin.finance.cheques.bankName')}</span>
            <div dir="auto">{detail.bank ?? t('admin.finance.unavailable')}</div>
          </div>
          <div>
            <span className="muted tiny">{t('nav.students')}</span>
            <div dir="auto">{detail.studentName ?? t('admin.finance.unavailable')}</div>
          </div>
          <div>
            <span className="muted tiny">{t('admin.finance.cheques.holderName')}</span>
            <div dir="auto">{detail.payer ?? t('admin.finance.unavailable')}</div>
          </div>
        </div>

        {cheque.settlement_status?.trim().toLowerCase() === 'settled' ? (
          <div className="cheque-details__alert cheque-details__alert--settled" role="status">
            <p>{t('admin.finance.cheques.lifecycle.settledStatusBanner')}</p>
            {cheque.settlement_date ? (
              <p className="muted tiny">
                {t('admin.finance.cheques.lifecycle.settlementDate')}: {formatDate(cheque.settlement_date)}
              </p>
            ) : null}
            {cheque.bank_reference ? (
              <p className="mono tiny" dir="ltr">
                {t('admin.finance.cheques.lifecycle.bankReference')}: {cheque.bank_reference}
              </p>
            ) : null}
          </div>
        ) : null}

        {cheque.settlement_status?.trim().toLowerCase() === 'rejected' || isRejectedCheque(cheque.state) ? (
          <div className="cheque-details__alert cheque-details__alert--rejected" role="alert">
            <p>{t('admin.finance.cheques.lifecycle.paymentReturnedToBalance')}</p>
            <p className="cheque-details__alert-reason">
              {detail.rejectionReason
                ? t('admin.finance.cheques.details.rejectionReason', { reason: detail.rejectionReason })
                : t('admin.finance.cheques.details.noRejectionReason')}
            </p>
          </div>
        ) : null}
      </section>

      <div className="cheque-details__grid">
        <section className="card cheque-details__section">
          <h2>{t('admin.finance.cheques.details.coreSection')}</h2>
          <dl className="cheque-details__fields">
            <DetailField label={t('admin.finance.cheques.chequeNumber')}>
              <span className="mono" dir="auto" title={detail.displayNumber}>{detail.displayNumber}</span>
            </DetailField>
            <DetailField label={t('admin.finance.cheques.bankName')} hideWhenEmpty>
              {detail.bank ? <span dir="auto">{detail.bank}</span> : null}
            </DetailField>
            <DetailField label={t('admin.finance.collectionAmount')}>
              <FinanceMoney amount={detail.amount} currency={detail.currency} />
            </DetailField>
            <DetailField label={t('admin.finance.cheques.receivedDate')}>
              {formatDate(cheque.received_date) || t('admin.finance.unavailable')}
            </DetailField>
            <DetailField label={t('admin.finance.cheques.details.depositedDate')} hideWhenEmpty>
              {formatDate(cheque.deposited_date ?? cheque.deposit_date) || null}
            </DetailField>
            <DetailField label={t('admin.finance.cheques.dueDate')}>
              {formatDate(cheque.due_date ?? cheque.maturity_date) || t('admin.finance.unavailable')}
            </DetailField>
            <DetailField label={t('academic.status')}>
              <ChequeStatusBadge
              state={cheque.state ?? 'received'}
              settlementStatus={cheque.settlement_status}
            />
            </DetailField>
          </dl>
        </section>

        <section className="card cheque-details__section">
          <h2>{t('admin.finance.cheques.details.partiesSection')}</h2>
          <div className="cheque-details__party-block">
            <h3>{t('admin.finance.cheques.holderName')}</h3>
            <p dir="auto">{detail.payer ?? t('admin.finance.unavailable')}</p>
          </div>
          <div className="cheque-details__party-block">
            <h3>{t('nav.students')}</h3>
            <p dir="auto">
              {detail.studentName ?? t('admin.finance.unavailable')}
              {detail.studentCode ? (
                <span className="mono muted"> · {detail.studentCode}</span>
              ) : null}
            </p>
          </div>
          {detail.school ? (
            <div className="cheque-details__party-block">
              <h3>{t('admin.finance.cheques.details.schoolLabel')}</h3>
              <p dir="auto">{detail.school}</p>
            </div>
          ) : null}
          {detail.collectionId ? (
            <div className="cheque-details__party-block">
              <h3>{t('admin.finance.cheques.details.relatedCollection')}</h3>
              {collectionStateRes.loading && !collection ? (
                <p className="muted">{t('common.loading')}</p>
              ) : collection ? (
                <dl className="cheque-details__fields cheque-details__fields--compact">
                  <DetailField label={t('admin.finance.reference')}>
                    <span dir="auto">{formatCollectionReference(collection)}</span>
                  </DetailField>
                  <DetailField label={t('admin.finance.collectionAmount')}>
                    <FinanceMoney amount={collection.amount ?? collection.total_amount} currency={collection.currency} />
                  </DetailField>
                  <DetailField label={t('common.date')}>
                    {formatDate(collection.collection_date ?? collection.date) || t('admin.finance.unavailable')}
                  </DetailField>
                  <DetailField label={t('academic.status')}>
                    <FinanceStatusBadge state={collectionState(collection) || 'unknown'} />
                  </DetailField>
                  <DetailField label={t('admin.finance.collections.columns.payer')}>
                    <span dir="auto">{getCollectionPayerLabel(collection, t('admin.finance.unavailable'))}</span>
                  </DetailField>
                </dl>
              ) : collectionStateRes.error ? (
                <p className="muted">#{detail.collectionId}</p>
              ) : (
                <p className="muted">#{detail.collectionId}</p>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {detail.reversalApplied || isRejectedCheque(cheque.state) ? (
        <section className="card cheque-details__section cheque-details__impact">
          <h2>{t('admin.finance.cheques.details.financialImpact')}</h2>
          {detail.reversalApplied ? (
            <p>
              {t('admin.finance.cheques.details.reversalSummaryPrefix')}{' '}
              <FinanceMoney amount={detail.amount} currency={detail.currency} />
              {detail.reversedAllocations > 0
                ? ` ${
                    detail.reversedAllocations === 1
                      ? t('admin.finance.cheques.details.reversalSummaryOne')
                      : t('admin.finance.cheques.details.reversalSummaryMany', {
                          count: detail.reversedAllocations,
                        })
                  }`
                : ` ${t('admin.finance.cheques.details.reversalSummarySuffix')}`}
            </p>
          ) : null}
          {!detail.reversalApplied ? (
            <p className="muted">{t('admin.finance.cheques.details.impactUnavailable')}</p>
          ) : null}
        </section>
      ) : null}

      <section className="card cheque-details__section">
        <h2>{t('admin.finance.cheques.details.timelineSection')}</h2>
        <ol className="cheque-details__timeline">
          {detail.timeline.map((event) => {
            const isCurrent =
              (event.id === 'rejected' && isRejectedCheque(cheque.state)) ||
              (event.id === 'cleared' && cheque.state === 'cleared') ||
              (event.id === 'deposited' && cheque.state === 'deposited');
            return (
            <li
              key={event.id}
              className={`cheque-details__timeline-item${isCurrent ? ' is-current' : ''}`}
            >
              <div className="cheque-details__timeline-marker" aria-hidden />
              <div className="cheque-details__timeline-body">
                <div className="cheque-details__timeline-head">
                  {event.date ? <time dateTime={event.date}>{formatDate(event.date)}</time> : null}
                  <strong>{t(event.titleKey)}</strong>
                </div>
                {event.reason ? (
                  <p className="muted">{t('admin.finance.cheques.reason')}: {event.reason}</p>
                ) : null}
              </div>
            </li>
            );
          })}
        </ol>
      </section>

      {showReadOnlyNotice ? (
        <p className="muted cheque-details__read-only">{t('admin.finance.cheques.details.readOnlyNotice')}</p>
      ) : null}

      {dialogAction && cheque ? (
        <ChequeLifecycleDialogs
          cheque={cheque}
          openAction={dialogAction}
          onClose={() => setDialogAction(null)}
          onComplete={() => {
            state.reload();
            collectionStateRes.reload();
          }}
        />
      ) : null}
    </div>
  );
}
