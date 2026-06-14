'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';

export function ConfirmationDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  variant = 'primary',
  size = 'default',
  closeOnBackdrop = true,
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  size?: 'default' | 'wide' | 'form';
  closeOnBackdrop?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    if (submitting || loading) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || loading;
  const panelSizeClass =
    size === 'form' ? 'modal-panel--form' : size === 'wide' ? 'modal-panel--wide' : '';

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`card modal-panel confirmation-dialog${panelSizeClass ? ` ${panelSizeClass}` : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        <div className="confirmation-dialog__body">{body}</div>
        <div className="row confirmation-dialog__actions">
          <button
            type="button"
            className={variant === 'danger' ? 'btn btn--sm' : 'btn btn--primary btn--sm'}
            disabled={busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? t('common.submitting') : (confirmLabel ?? t('common.confirm'))}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onClose}>
            {cancelLabel ?? t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
