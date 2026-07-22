'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 * Scope: optional official collection entry AFTER successful registration only.
 * Independent from registration mutation. Payment-during-registration remains out of scope.
 * Does not adopt full Finance Workspace / QuickPaymentDrawer chrome.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FamilyCollectionDrawer } from '@/features/admin/finance/family-collection-drawer';
import { StudentCollectionDrawer } from '@/features/admin/finance/student-collection-drawer';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { canCollectPayments } from '@/lib/permissions/finance';
import { useStudentFamilyFinanceSummary } from '@/features/admin/student-finance/hooks/use-student-family-finance';
import type { FamilyCollectionCreateResponse } from '@/types/family-finance';
import type { PaymentCollection } from '@/types/finance';
import {
  readReceiptIdFromCollection,
  registrationCollectionFinanceHref,
  resolveRegistrationCollectionEntry,
  type RegistrationCollectionEntryTarget,
} from '../utils/resolve-registration-collection-entry';

export type RegistrationCollectionPhase =
  | 'idle'
  | 'resolving'
  | 'open'
  | 'cancelled'
  | 'failed'
  | 'succeeded'
  | 'receipt_unavailable';

function unavailableMessageKey(reason: string): string {
  return `admin.student360.registrationCollection.unavailable.${reason}`;
}

export function RegistrationPostCreateCollectionEntry({
  succeededStudentIds,
  studentNameById,
  billingUnresolved = false,
  collectionAllowed = null,
  billingPartnerIdHint = null,
  className,
}: {
  succeededStudentIds: number[];
  studentNameById?: Record<number, string>;
  billingUnresolved?: boolean;
  collectionAllowed?: boolean | null;
  billingPartnerIdHint?: number | null;
  className?: string;
}) {
  const t = useT();
  const user = useSession();
  const canCollect = canCollectPayments(user);

  const [phase, setPhase] = useState<RegistrationCollectionPhase>('idle');
  const [requestOpen, setRequestOpen] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [activeTarget, setActiveTarget] = useState<Extract<
    RegistrationCollectionEntryTarget,
    { kind: 'student' | 'family' }
  > | null>(null);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const primaryStudentId = succeededStudentIds.find((id) => id > 0) ?? null;

  const {
    data: familySummary,
    loading: summaryLoading,
    error: summaryError,
    reload: reloadSummary,
  } = useStudentFamilyFinanceSummary(primaryStudentId, requestOpen, refreshSignal);

  const resolvedTarget = useMemo(
    () =>
      resolveRegistrationCollectionEntry({
        succeededStudentIds,
        billingUnresolved,
        collectionAllowed,
        familySummary,
        billingPartnerIdHint,
        summaryResolved: requestOpen && !summaryLoading,
      }),
    [
      succeededStudentIds,
      billingUnresolved,
      collectionAllowed,
      familySummary,
      billingPartnerIdHint,
      requestOpen,
      summaryLoading,
    ],
  );

  useEffect(() => {
    if (!requestOpen || summaryLoading) return;

    if (resolvedTarget.kind === 'unavailable') {
      setActiveTarget(null);
      setPhase('idle');
      setResolveError(unavailableMessageKey(resolvedTarget.reason));
      setRequestOpen(false);
      return;
    }

    if (summaryError && !familySummary && succeededStudentIds.length > 1) {
      setActiveTarget(null);
      setPhase('idle');
      setResolveError('admin.student360.registrationCollection.unavailable.context_unresolved');
      setRequestOpen(false);
      return;
    }

    setResolveError(null);
    setActiveTarget(resolvedTarget);
    setPhase('open');
  }, [
    requestOpen,
    summaryLoading,
    resolvedTarget,
    summaryError,
    familySummary,
    succeededStudentIds.length,
  ]);

  const financeHref = primaryStudentId
    ? registrationCollectionFinanceHref(primaryStudentId)
    : '/admin/finance';

  const handleOpenCollect = useCallback(() => {
    if (!canCollect || !primaryStudentId) return;
    if (billingUnresolved || collectionAllowed === false) {
      setResolveError(
        unavailableMessageKey(billingUnresolved ? 'billing_unresolved' : 'collection_blocked'),
      );
      return;
    }
    setResolveError(null);
    setReceiptId(null);
    setCollectionId(null);
    setPhase('resolving');
    setRequestOpen(true);
    setRefreshSignal((n) => n + 1);
  }, [canCollect, primaryStudentId, billingUnresolved, collectionAllowed]);

  const handleCloseDrawer = useCallback(() => {
    setActiveTarget(null);
    setRequestOpen(false);
    setPhase((prev) => (prev === 'succeeded' || prev === 'receipt_unavailable' ? prev : 'cancelled'));
  }, []);

  const handleStudentSuccess = useCallback((collection: PaymentCollection) => {
    const nextReceipt = readReceiptIdFromCollection(collection);
    setCollectionId(collection.id);
    setReceiptId(nextReceipt);
    setPhase(nextReceipt ? 'succeeded' : 'receipt_unavailable');
    setActiveTarget(null);
    setRequestOpen(false);
  }, []);

  const handleFamilySuccess = useCallback((result: FamilyCollectionCreateResponse) => {
    const nextReceipt = readReceiptIdFromCollection(result);
    setCollectionId(typeof result.collection_id === 'number' ? result.collection_id : null);
    setReceiptId(nextReceipt);
    setPhase(nextReceipt ? 'succeeded' : 'receipt_unavailable');
    setActiveTarget(null);
    setRequestOpen(false);
  }, []);

  const retryReceiptLookup = useCallback(() => {
    if (collectionId) {
      window.open(`/admin/finance/collections/${collectionId}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (primaryStudentId) {
      window.open(registrationCollectionFinanceHref(primaryStudentId), '_blank', 'noopener,noreferrer');
    }
  }, [collectionId, primaryStudentId]);

  if (!canCollect || succeededStudentIds.length === 0) {
    return null;
  }

  const studentDrawerOpen = phase === 'open' && activeTarget?.kind === 'student';
  const familyDrawerOpen = phase === 'open' && activeTarget?.kind === 'family';
  const studentName =
    activeTarget && studentNameById
      ? studentNameById[activeTarget.studentId]
      : undefined;

  return (
    <div
      className={className ?? 'registration-post-create-collection'}
      data-testid="registration-post-create-collection"
      data-phase={phase}
    >
      <div className="registration-post-create-collection__actions">
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="registration-collect-payment"
          disabled={phase === 'resolving' || phase === 'open'}
          onClick={handleOpenCollect}
        >
          {phase === 'resolving'
            ? t('admin.student360.registrationCollection.resolving')
            : t('admin.student360.registrationCollection.collectAction')}
        </button>
        <Link href={financeHref} className="btn btn--ghost btn--sm">
          {t('admin.student360.registrationCollection.openFinance')}
        </Link>
      </div>

      {phase === 'idle' && !resolveError ? (
        <p className="muted tiny" role="note">
          {t('admin.student360.registrationCollection.optionalHint')}
        </p>
      ) : null}

      {resolveError ? (
        <p
          className="student-create-form__notice"
          role="status"
          data-testid="registration-collect-unavailable"
        >
          {t(resolveError)}{' '}
          <Link href={financeHref}>{t('admin.student360.registrationCollection.openFinance')}</Link>
          {summaryError ? (
            <>
              {' '}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setResolveError(null);
                  setPhase('resolving');
                  setRequestOpen(true);
                  reloadSummary();
                }}
              >
                {t('common.retry')}
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      {phase === 'cancelled' ? (
        <p className="muted tiny" role="status" data-testid="registration-collect-cancelled">
          {t('admin.student360.registrationCollection.cancelledKeepRegistration')}
        </p>
      ) : null}

      {phase === 'failed' ? (
        <p className="student-create-review__alert" role="status" data-testid="registration-collect-failed">
          {t('admin.student360.registrationCollection.failedKeepRegistration')}
        </p>
      ) : null}

      {phase === 'succeeded' ? (
        <div
          className="student-create-form__notice"
          role="status"
          data-testid="registration-collect-succeeded"
        >
          <p>{t('admin.student360.registrationCollection.successBody')}</p>
          {receiptId ? (
            <Link
              href={`/admin/finance/receipts/${receiptId}`}
              className="btn btn--ghost btn--sm"
              data-testid="registration-collect-receipt-link"
            >
              {t('admin.student360.registrationCollection.openReceipt')}
            </Link>
          ) : null}
          {collectionId ? (
            <Link
              href={`/admin/finance/collections/${collectionId}`}
              className="btn btn--ghost btn--sm"
            >
              {t('admin.student360.registrationCollection.openCollection')}
            </Link>
          ) : null}
        </div>
      ) : null}

      {phase === 'receipt_unavailable' ? (
        <div
          className="student-create-form__notice"
          role="status"
          data-testid="registration-collect-receipt-unavailable"
        >
          <p>{t('admin.student360.registrationCollection.receiptUnavailable')}</p>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={retryReceiptLookup}
            data-testid="registration-collect-receipt-retry"
          >
            {t('admin.student360.registrationCollection.retryReceipt')}
          </button>
        </div>
      ) : null}

      {activeTarget?.kind === 'student' ? (
        <StudentCollectionDrawer
          open={studentDrawerOpen}
          studentId={activeTarget.studentId}
          studentName={studentName}
          billingPartnerId={billingPartnerIdHint ?? undefined}
          onClose={handleCloseDrawer}
          onSuccess={handleStudentSuccess}
        />
      ) : null}

      {activeTarget?.kind === 'family' ? (
        <FamilyCollectionDrawer
          open={familyDrawerOpen}
          familyId={activeTarget.familyId}
          accountName={activeTarget.accountName ?? undefined}
          prefilledStudentId={activeTarget.studentId}
          prefilledStudentName={studentName}
          entrySource="student360"
          navigateToReceiptOnSuccess={false}
          onClose={handleCloseDrawer}
          onSuccess={handleFamilySuccess}
        />
      ) : null}
    </div>
  );
}
