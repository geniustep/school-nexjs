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
  const isFormDialog = size === 'form';
  const panelSizeClass =
    isFormDialog ? 'modal-panel--form' : size === 'wide' ? 'modal-panel--wide' : '';

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={closeOnBackdrop && !busy ? onClose : undefined}
      style={isFormDialog ? {
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'grid',
        placeItems: 'center',
        overflowY: 'auto',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.46)',
        backdropFilter: 'blur(2px)',
      } : undefined}
    >
      <div
        className={`card modal-panel confirmation-dialog${panelSizeClass ? ` ${panelSizeClass}` : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={isFormDialog ? {
          width: 'min(960px, 100%)',
          maxHeight: 'calc(100dvh - 32px)',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          margin: 'auto',
          padding: '18px',
          borderRadius: '16px',
          border: '1px solid var(--c-border)',
          background: 'var(--c-surface)',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.24)',
        } : undefined}
      >
        <h3 style={isFormDialog ? { margin: '0 0 14px', flexShrink: 0 } : undefined}>{title}</h3>
        <div
          className="confirmation-dialog__body"
          style={isFormDialog ? {
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            paddingInlineEnd: '2px',
          } : undefined}
        >
          {body}
        </div>
        <div
          className="row confirmation-dialog__actions"
          style={isFormDialog ? {
            flexShrink: 0,
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid var(--c-border)',
          } : undefined}
        >
          <button
            type="button"
            className={variant === 'danger' ? 'btn btn--danger btn--sm' : 'btn btn--primary btn--sm'}
            disabled={busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? t('common.submitting') : (confirmLabel ?? t('common.confirm'))}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={() => {
              if (!busy) onClose();
            }}
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
