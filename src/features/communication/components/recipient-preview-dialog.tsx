'use client';

import { useEffect, useId, useRef } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { RecipientSummaryPanel } from '@/features/communication/components/recipient-summary-panel';
import type { CommunicationRecipientSummary } from '@/types/communication';

export function RecipientPreviewDialog({
  open,
  summary,
  composeMode = 'unknown',
  loading = false,
  confirming = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  summary: CommunicationRecipientSummary | null;
  /** internal → staff-only publish notice; submit → moderation notice. */
  composeMode?: 'internal' | 'submit' | 'unknown';
  loading?: boolean;
  confirming?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const busy = loading || confirming;
  const canSubmit = summary?.can_submit !== false;
  const confirmDisabled = busy || !summary || !canSubmit;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const outcomeHint =
    composeMode === 'internal'
      ? t('communication.recipients.internalPublishHint')
      : composeMode === 'submit'
        ? t('communication.recipients.pendingReviewHint')
        : null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="card modal-panel confirmation-dialog modal-panel--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId}>{t('communication.recipients.previewTitle')}</h3>
        <div className="confirmation-dialog__body">
          {loading && !summary ? (
            <p className="tiny" role="status">
              {t('communication.recipients.previewLoading')}
            </p>
          ) : (
            <RecipientSummaryPanel summary={summary} presentation="preview" />
          )}
          {outcomeHint ? (
            <p className="tiny" style={{ marginTop: '0.75rem' }}>
              {outcomeHint}
            </p>
          ) : null}
        </div>
        <div className="row confirmation-dialog__actions">
          <button
            ref={confirmRef}
            type="button"
            className="btn btn--primary btn--sm"
            disabled={confirmDisabled}
            aria-disabled={confirmDisabled}
            onClick={() => {
              if (confirmDisabled) return;
              void onConfirm();
            }}
          >
            {confirming
              ? t('channels.sending')
              : t('communication.recipients.confirmSend')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
