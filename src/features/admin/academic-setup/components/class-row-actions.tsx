'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';

export function ClassRowActions({
  onView,
  canManage,
}: {
  onView: () => void;
  canManage: boolean;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!canManage) return null;

  return (
    <div className="academic-setup-class-actions" ref={rootRef}>
      <button
        type="button"
        className="academic-setup-class-actions__trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t('admin.academicSetup.classActionsMenu')}
        title={t('admin.academicSetup.classActionsMenu')}
        onClick={() => setMenuOpen((v) => !v)}
      >
        ⋯
      </button>
      {menuOpen && (
        <div className="academic-setup-level-actions__menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="academic-setup-level-actions__item"
            onClick={() => {
              setMenuOpen(false);
              onView();
            }}
          >
            {t('common.view')}
          </button>
        </div>
      )}
    </div>
  );
}
