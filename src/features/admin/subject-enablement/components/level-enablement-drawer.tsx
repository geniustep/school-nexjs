'use client';

import { useCallback, useEffect, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useT } from '@/features/i18n/locale-context';
import type { Level, Subject } from '@/types/class';
import { useLevelEnablementMatrix } from '../hooks/use-level-enablement-matrix';
import {
  confirmDiscardEnablementDraft,
  LevelEnablementMatrixPanel,
} from './level-enablement-matrix-panel';

export function LevelEnablementDrawer({
  open,
  level,
  operationalSubjects,
  onClose,
  onOpenReferenceEnable,
  onSaved,
}: {
  open: boolean;
  level: Level | null;
  operationalSubjects: Subject[];
  onClose: () => void;
  /** Existing catalog enable flow (POST /admin/subjects/enable). */
  onOpenReferenceEnable?: () => void;
  onSaved?: () => void;
}) {
  const t = useT();
  const [dirty, setDirty] = useState(false);
  const { matrix, loading, error, reload } = useLevelEnablementMatrix(
    open ? level : null,
    operationalSubjects,
    open,
  );

  useEffect(() => {
    if (!open) setDirty(false);
  }, [open]);

  const requestClose = useCallback(() => {
    if (!confirmDiscardEnablementDraft(dirty, t)) return;
    onClose();
  }, [dirty, onClose, t]);

  const title = level
    ? t('admin.subjectEnablement.manageLevelTitle', { level: level.name })
    : t('admin.subjectEnablement.manageLevelFallback');

  return (
    <SetupDrawer open={open} title={title} onClose={requestClose}>
      <LevelEnablementMatrixPanel
        matrix={matrix}
        loading={loading}
        error={error}
        onRetry={reload}
        onSaved={onSaved}
        onDirtyChange={setDirty}
      />
      {onOpenReferenceEnable ? (
        <div className="row" style={{ gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onOpenReferenceEnable}>
            {t('admin.academicSetup.enableSubjects')}
          </button>
          <span className="tiny muted">{t('admin.subjectEnablement.referenceEnableHint')}</span>
        </div>
      ) : null}
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button type="button" className="btn btn--ghost" onClick={requestClose}>
          {t('common.close')}
        </button>
      </div>
    </SetupDrawer>
  );
}
