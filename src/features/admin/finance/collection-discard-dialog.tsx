'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { discardCollection } from '@/lib/finance/payment-collection-api';
import { collectionDiscardErrorMessageKey } from '@/features/admin/finance/collection-discard';
import type { ApiResponse } from '@/types/api';

export const COLLECTION_DISCARD_DIALOG_TITLE_KEY =
  'admin.finance.collections.detail.discardDraft.title';

type DiscardCollectionFn = (collectionId: number) => Promise<ApiResponse<unknown>>;

export async function submitCollectionDiscard(params: {
  collectionId: number;
  discardFn: DiscardCollectionFn;
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
  t: (key: string) => string;
  onSuccess: () => void;
}): Promise<boolean> {
  const res = await params.discardFn(params.collectionId);
  if (res.success) {
    params.toastSuccess(params.t('admin.finance.collections.detail.discardDraft.success'));
    params.onSuccess();
    return true;
  }

  const status =
    typeof res.error?.details?.status === 'number' ? res.error.details.status : undefined;
  const key = collectionDiscardErrorMessageKey(res.error?.code, status);
  params.toastError(params.t(key));
  return false;
}

export function CollectionDiscardDialog({
  collectionId,
  open,
  onClose,
  onSuccess,
}: {
  collectionId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const submittedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSubmitting(false);
      submittedRef.current = false;
    }
  }, [open, collectionId]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submittedRef.current) return;

    submittedRef.current = true;
    setSubmitting(true);
    const ok = await submitCollectionDiscard({
      collectionId,
      discardFn: discardCollection,
      toastSuccess: toast.success,
      toastError: toast.error,
      t,
      onSuccess: () => {
        onSuccess();
        onClose();
      },
    });
    setSubmitting(false);
    if (!ok) submittedRef.current = false;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={submitting ? undefined : onClose}>
      <form
        className="card modal-panel collection-reverse-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-discard-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <header className="collection-reverse-dialog__header">
          <span className="collection-reverse-dialog__icon" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
            </svg>
          </span>
          <h3 id="collection-discard-dialog-title" className="collection-reverse-dialog__title">
            {t(COLLECTION_DISCARD_DIALOG_TITLE_KEY)}
          </h3>
        </header>

        <div className="collection-reverse-dialog__body">
          <div className="collection-reverse-dialog__notice" role="alert">
            <span className="collection-reverse-dialog__notice-icon" aria-hidden="true">
              !
            </span>
            <p>{t('admin.finance.collections.detail.discardDraft.warning')}</p>
          </div>
        </div>

        <footer className="collection-reverse-dialog__footer">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn--danger btn--sm" disabled={submitting}>
            {submitting
              ? t('common.submitting')
              : t('admin.finance.collections.detail.discardDraft.confirm')}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function CollectionDiscardButton({
  collectionId,
  returnTo,
}: {
  collectionId: number;
  returnTo: string;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>
        {t(COLLECTION_DISCARD_DIALOG_TITLE_KEY)}
      </button>
      <CollectionDiscardDialog
        collectionId={collectionId}
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => router.push(returnTo)}
      />
    </>
  );
}
