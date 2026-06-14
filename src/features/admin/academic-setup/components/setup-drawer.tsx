'use client';

import { useEffect } from 'react';
import { useT } from '@/features/i18n/locale-context';

export function SetupDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="academic-setup-drawer-backdrop"
        role="presentation"
        onClick={onClose}
      />
      <aside className="academic-setup-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="academic-setup-drawer__head">
          <strong>{title}</strong>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
        <div className="academic-setup-drawer__body">{children}</div>
      </aside>
    </>
  );
}
