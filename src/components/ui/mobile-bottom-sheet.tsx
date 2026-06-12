'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

export function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
  labelledBy,
  closeLabel = 'Close',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  labelledBy?: string;
  closeLabel?: string;
}) {
  const fallbackId = useId();
  const titleId = labelledBy ?? `sheet-title-${fallbackId}`;
  const panelRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="mobile-sheet__scrim"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className="mobile-sheet__handle" aria-hidden />
        {title && (
          <header className="mobile-sheet__header">
            <h2 id={titleId} className="mobile-sheet__title">
              {title}
            </h2>
            <button
              type="button"
              className="mobile-sheet__close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </header>
        )}
        <div className="mobile-sheet__body">{children}</div>
      </div>
    </>
  );
}
