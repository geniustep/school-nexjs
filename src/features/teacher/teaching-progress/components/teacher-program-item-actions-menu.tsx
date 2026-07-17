'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherProgramSecondaryAction } from '@/features/teaching-progress/program-item-primary-action';

export function TeacherProgramItemActionsMenu({
  actions,
  onAction,
}: {
  actions: TeacherProgramSecondaryAction[];
  onAction: (action: TeacherProgramSecondaryAction) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div
      className="teacher-program-actions-menu"
      ref={rootRef}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="btn btn--ghost btn--sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('teacher.teachingProgress.moreActions')}
        onClick={() => setOpen((v) => !v)}
      >
        {t('teacher.teachingProgress.moreActions')}
      </button>
      {open ? (
        <div id={menuId} className="teacher-program-actions-menu__panel" role="menu">
          {actions.map((action) =>
            action.href ? (
              <a
                key={action.key}
                role="menuitem"
                className="teacher-program-actions-menu__item"
                href={action.href}
                onClick={() => setOpen(false)}
              >
                {t(action.labelKey)}
              </a>
            ) : (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                className="teacher-program-actions-menu__item"
                onClick={() => {
                  setOpen(false);
                  onAction(action);
                }}
              >
                {t(action.labelKey)}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
