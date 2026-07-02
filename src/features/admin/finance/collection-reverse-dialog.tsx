'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { cancelPaymentCollection } from '@/lib/finance/payment-collection-api';
import {
  collectionReverseErrorMessageKey,
  validateCollectionReverseReason,
} from '@/features/admin/finance/collection-reverse';
import type { PaymentCollection } from '@/types/finance';

export function CollectionReverseDialog({
  collectionId,
  open,
  onClose,
  onSuccess,
}: {
  collectionId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: (collection: PaymentCollection) => void;
}) {
  const t = useT();
  const toast = useToast();
  const submittedRef = useRef(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setReasonError(null);
      setSubmitting(false);
      submittedRef.current = false;
    }
  }, [open, collectionId]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submittedRef.current) return;

    if (!validateCollectionReverseReason(reason)) {
      const message = t('admin.finance.collections.detail.reverse.reasonRequired');
      setReasonError(message);
      return;
    }

    submittedRef.current = true;
    setSubmitting(true);
    const res = await cancelPaymentCollection(collectionId, reason.trim());
    setSubmitting(false);

    if (res.success) {
      toast.success(t('admin.finance.collections.detail.reverse.success'));
      onSuccess((res.data ?? {}) as PaymentCollection);
      onClose();
      return;
    }

    submittedRef.current = false;
    const status =
      typeof res.error?.details?.status === 'number' ? res.error.details.status : undefined;
    const key = collectionReverseErrorMessageKey(res.error?.code, status);
    toast.error(t(key));
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={submitting ? undefined : onClose}>
      <form
        className="card modal-panel modal-panel--form collection-reverse-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3>{t('admin.finance.collections.detail.reverse.title')}</h3>
        <p className="collection-reverse-dialog__warning" role="alert">
          {t('admin.finance.collections.detail.reverse.warning')}
        </p>
        <label className="collection-reverse-dialog__field">
          <span>
            {t('admin.finance.collections.detail.reverse.reasonLabel')}
            <span className="collection-reverse-dialog__required" aria-hidden>
              {' '}
              *
            </span>
          </span>
          <textarea
            className="input"
            rows={3}
            required
            value={reason}
            disabled={submitting}
            aria-invalid={reasonError ? true : undefined}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError(null);
            }}
          />
          {reasonError ? <span className="form-error">{reasonError}</span> : null}
        </label>
        <div className="collection-reverse-dialog__actions">
          <button type="submit" className="btn btn--danger btn--sm" disabled={submitting}>
            {submitting
              ? t('common.submitting')
              : t('admin.finance.collections.detail.reverse.confirm')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CollectionReverseButton({
  collectionId,
  onSuccess,
}: {
  collectionId: number;
  onSuccess: (collection: PaymentCollection) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>
        {t('admin.finance.collections.detail.reverse.title')}
      </button>
      <CollectionReverseDialog
        collectionId={collectionId}
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}
