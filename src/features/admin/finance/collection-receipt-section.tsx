'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/states/states';
import { ReceiptPdfActions } from '@/features/admin/finance/receipt-pdf-actions';
import { ReceiptSettlementBadge, ReceiptStateBadge } from '@/features/admin/finance/receipt-status-badges';
import { useT } from '@/features/i18n/locale-context';
import {
  fetchCollectionReceipt,
  issueCollectionReceipt,
} from '@/lib/api/finance-receipt';
import { getCollectionReceiptLabel } from '@/features/admin/finance/collection-detail-review';
import { collectionState } from '@/lib/utils/finance';
import type { FinanceReceipt, PaymentCollection } from '@/types/finance';

function collectionAllowsReceiptAction(collection: PaymentCollection, action: string): boolean {
  return (collection.allowed_actions ?? []).includes(action);
}

export function CollectionReceiptSection({
  collection,
  onChanged,
  returnTo,
}: {
  collection: PaymentCollection;
  onChanged?: () => void;
  returnTo?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [receipt, setReceipt] = useState<FinanceReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canViewReceipt =
    !!collection.receipt_id ||
    collectionAllowsReceiptAction(collection, 'receipt') ||
    collectionAllowsReceiptAction(collection, 'print') ||
    collectionAllowsReceiptAction(collection, 'download');

  const canIssue =
    !collection.receipt_id &&
    (collectionAllowsReceiptAction(collection, 'issue') ||
      collectionAllowsReceiptAction(collection, 'receipt'));

  const loadReceipt = useCallback(async () => {
    if (!canViewReceipt && !canIssue) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCollectionReceipt(collection.id);
      setReceipt(data);
    } catch {
      setError(t('admin.finance.receipts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [canIssue, canViewReceipt, collection.id, t]);

  useEffect(() => {
    if (canViewReceipt) void loadReceipt();
  }, [canViewReceipt, loadReceipt]);

  const issueLabel = useMemo(() => t('admin.finance.receipts.issueReceipt'), [t]);

  async function handleIssue() {
    if (issuing) return;
    setIssuing(true);
    setError(null);
    try {
      const { receipt: issued, error: issueError } = await issueCollectionReceipt(collection.id);
      if (issueError) {
        setError(t(issueError.message ?? 'errors.attachmentFailed'));
        return;
      }
      if (issued) {
        setReceipt(issued);
        onChanged?.();
        router.push(`/admin/finance/receipts/${issued.id}`);
      }
    } finally {
      setIssuing(false);
    }
  }

  if (!canViewReceipt && !canIssue) {
    const status = collectionState(collection);
    const hasReceipt =
      !!collection.receipt_id ||
      (typeof collection.receipt_number === 'string' && collection.receipt_number.trim());
    return (
      <section className="card collection-details__section collection-receipt-section">
        <h2>{t('admin.finance.receipts.sectionTitle')}</h2>
        {hasReceipt ? (
          <p dir="auto">
            <span className="muted">{t('admin.finance.receipts.fields.number')}: </span>
            {getCollectionReceiptLabel(collection, t)}
          </p>
        ) : (
          <p className="muted">
            {status === 'draft'
              ? t('admin.finance.collections.detail.receiptPendingDraft')
              : t('admin.finance.collections.detail.receiptNotIssued')}
          </p>
        )}
        {status === 'draft' && !hasReceipt ? (
          <p className="tiny muted">{t('admin.finance.collections.detail.receiptAfterConfirm')}</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="card collection-details__section collection-receipt-section">
      <h2>{t('admin.finance.receipts.sectionTitle')}</h2>
      {loading ? <LoadingState label={t('common.loading')} /> : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
          {canViewReceipt ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadReceipt()}>
              {t('common.retry')}
            </button>
          ) : null}
        </p>
      ) : null}
      {receipt ? (
        <div className="collection-receipt-section__body">
          <dl className="finance-detail-fields">
            <div className="finance-detail-field">
              <dt>{t('admin.finance.receipts.fields.number')}</dt>
              <dd>
                <Link href={`/admin/finance/receipts/${receipt.id}`} className="mono">
                  {receipt.number ?? receipt.receipt_number}
                </Link>
              </dd>
            </div>
            <div className="finance-detail-field">
              <dt>{t('academic.status')}</dt>
              <dd>
                <ReceiptStateBadge state={receipt.state ?? 'issued'} />
                {receipt.settlement_status ? (
                  <>
                    {' '}
                    <ReceiptSettlementBadge status={receipt.settlement_status} />
                  </>
                ) : null}
              </dd>
            </div>
          </dl>
          <div className="collection-receipt-section__actions">
            <Link href={`/admin/finance/receipts/${receipt.id}`} className="btn btn--ghost btn--sm">
              {t('admin.finance.receipts.viewReceipt')}
            </Link>
            <ReceiptPdfActions receipt={receipt} layout="bar" />
          </div>
        </div>
      ) : null}
      {!receipt && !loading && canIssue ? (
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={issuing}
          onClick={() => void handleIssue()}
        >
          {issuing ? t('admin.finance.receipts.issuing') : issueLabel}
        </button>
      ) : null}
    </section>
  );
}
