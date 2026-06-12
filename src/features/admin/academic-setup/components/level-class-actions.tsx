'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import type { LevelGroup } from '../types';
import { LevelRemoveDialog } from './level-remove-dialog';

export function LevelClassActions({
  group,
  canManage,
  supportsTracks = false,
  onRemoved,
}: {
  group: LevelGroup;
  canManage: boolean;
  supportsTracks?: boolean;
  onRemoved: () => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
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
    <div className="academic-setup-level-actions" ref={rootRef}>
      <button
        type="button"
        className="academic-setup-level-actions__trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t('admin.academicSetup.guided.levelActionsMenu')}
        title={t('admin.academicSetup.guided.levelActionsMenu')}
        onClick={() => setMenuOpen((v) => !v)}
      >
        ⋯
      </button>
      {menuOpen && (
        <div className="academic-setup-level-actions__menu" role="menu">
          <Link
            href={`/admin/levels/${group.id}`}
            role="menuitem"
            className="academic-setup-level-actions__item"
            onClick={() => setMenuOpen(false)}
          >
            {t('admin.academicSetup.viewLevelDetails')}
          </Link>
          <Link
            href={`/admin/levels/${group.id}`}
            role="menuitem"
            className="academic-setup-level-actions__item"
            onClick={() => setMenuOpen(false)}
          >
            {t('admin.academicSetup.guided.editLevelAction')}
          </Link>
          {supportsTracks && (
            <Link
              href={`/admin/settings/academic-setup/subjects?tab=tracks&level_id=${group.id}`}
              role="menuitem"
              className="academic-setup-level-actions__item"
              onClick={() => setMenuOpen(false)}
            >
              {t('admin.academicSetup.manageTracks')}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="academic-setup-level-actions__item academic-setup-level-actions__item--danger"
            onClick={() => {
              setMenuOpen(false);
              setRemoveOpen(true);
            }}
          >
            {t('admin.academicSetup.guided.removeLevelAction')}
          </button>
        </div>
      )}
      <LevelRemoveDialog
        level={group}
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onRemoved={() => {
          onRemoved();
          setRemoveOpen(false);
        }}
      />
    </div>
  );
}
