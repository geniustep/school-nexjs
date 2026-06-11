'use client';

import { useEffect } from 'react';
import { useT } from '@/features/i18n/locale-context';

export function AddClassesDrawer({
  open,
  levelName,
  onClose,
  onAddSingle,
  onAddBatch,
  batchAvailable = true,
}: {
  open: boolean;
  levelName: string;
  onClose: () => void;
  onAddSingle: () => void;
  onAddBatch?: () => void;
  batchAvailable?: boolean;
}) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="academic-setup-drawer-backdrop"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <aside
        className="academic-setup-drawer academic-setup-drawer--compact"
        role="dialog"
        aria-labelledby="add-classes-drawer-title"
      >
        <div className="academic-setup-drawer__head">
          <h2 id="add-classes-drawer-title">{t('admin.academicSetup.addClassesTitle')}</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
        <div className="academic-setup-drawer__body">
          <p className="muted tiny">{t('admin.academicSetup.addClassesDesc', { level: levelName })}</p>
          <div className="academic-setup-add-classes-options">
            <button
              type="button"
              className="academic-setup-add-classes-option"
              onClick={() => {
                onClose();
                onAddSingle();
              }}
            >
              <strong>{t('admin.academicSetup.addSingleClass')}</strong>
              <span className="tiny muted">{t('admin.academicSetup.addSingleClassDesc')}</span>
            </button>
            {batchAvailable && onAddBatch && (
              <button
                type="button"
                className="academic-setup-add-classes-option"
                onClick={() => {
                  onClose();
                  onAddBatch();
                }}
              >
                <strong>{t('admin.academicSetup.addMultipleClasses')}</strong>
                <span className="tiny muted">{t('admin.academicSetup.addMultipleClassesDesc')}</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
