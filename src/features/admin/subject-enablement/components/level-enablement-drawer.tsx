'use client';

import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useT } from '@/features/i18n/locale-context';
import type { Level, Subject } from '@/types/class';
import { useLevelEnablementMatrix } from '../hooks/use-level-enablement-matrix';
import { LevelEnablementMatrixPanel } from './level-enablement-matrix-panel';

export function LevelEnablementDrawer({
  open,
  level,
  operationalSubjects,
  onClose,
  onOpenReferenceEnable,
}: {
  open: boolean;
  level: Level | null;
  operationalSubjects: Subject[];
  onClose: () => void;
  /** Existing catalog enable flow (POST /admin/subjects/enable). */
  onOpenReferenceEnable?: () => void;
}) {
  const t = useT();
  const { matrix, loading, error, reload } = useLevelEnablementMatrix(
    open ? level : null,
    operationalSubjects,
    open,
  );

  const title = level
    ? t('admin.subjectEnablement.manageLevelTitle', { level: level.name })
    : t('admin.subjectEnablement.manageLevelFallback');

  return (
    <SetupDrawer open={open} title={title} onClose={onClose}>
      <LevelEnablementMatrixPanel
        matrix={matrix}
        loading={loading}
        error={error}
        onRetry={reload}
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
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </SetupDrawer>
  );
}
