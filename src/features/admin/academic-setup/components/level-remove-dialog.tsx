'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { Level } from '@/types/class';
import type { SchoolLevelUsage } from '@/types/academic-levels';
import { removeSchoolLevel } from '../hooks/use-level-actions';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import {
  formatUsageLines,
  mergeUsageFromError,
  primaryLinkedItemsRoute,
  resolveLevelRemovalFlags,
} from '../utils/level-usage';

export function LevelRemoveDialog({
  level,
  open,
  onClose,
  onRemoved,
}: {
  level: Level;
  open: boolean;
  onClose: () => void;
  onRemoved: (action: 'deleted' | 'deactivated') => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState<SchoolLevelUsage>(() => resolveLevelRemovalFlags(level).usage);
  const [blocked, setBlocked] = useState(false);

  const { canDelete } = resolveLevelRemovalFlags(level);
  const usageLines = formatUsageLines(usage, t);
  const linkedRoute = primaryLinkedItemsRoute(level.id, usage);
  const showBlocked = blocked || canDelete === false;

  useEffect(() => {
    if (!open) return;
    const flags = resolveLevelRemovalFlags(level);
    setUsage(flags.usage);
    setBlocked(flags.blockedByBackend);
  }, [open, level]);

  if (!open) return null;

  async function handleConfirm() {
    setSaving(true);
    const res = await removeSchoolLevel(level.id, activeSchoolId);
    setSaving(false);

    if (!res.ok) {
      const merged = mergeUsageFromError(level, res.error);
      setUsage(merged);
      if (res.error.code === 'level_in_use') {
        setBlocked(true);
      }
      toast.error(mapAcademicSetupApiError(res.error, t, 'level'));
      return;
    }

    if (res.data.action === 'deleted') {
      toast.success(t('admin.academicSetup.guided.levelRemovedDeleted'));
      onRemoved('deleted');
    } else if (res.data.action === 'deactivated') {
      toast.success(t('admin.academicSetup.guided.levelRemovedDeactivated'));
      onRemoved('deactivated');
    } else {
      toast.error(t('admin.academicSetup.guided.levelCannotRemove'));
      return;
    }
    onClose();
  }

  return (
    <>
      <div className="academic-setup-drawer-backdrop" role="presentation" onClick={onClose} />
      <aside
        className="academic-setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-remove-title"
      >
        <h2 id="level-remove-title" className="admin-section__title">
          {t('admin.academicSetup.guided.removeLevelTitle')}
        </h2>

        {showBlocked ? (
          <>
            <p>{t('admin.academicSetup.guided.levelInUseBlocked')}</p>
            {usageLines.length > 0 && (
              <ul className="academic-setup-usage-list">
                {usageLines.map((line) => (
                  <li key={line.key}>{line.label}</li>
                ))}
              </ul>
            )}
            <div className="row mt-2" style={{ gap: 8, flexWrap: 'wrap' }}>
              {linkedRoute && (
                <Link href={linkedRoute} className="btn btn--primary btn--sm" onClick={onClose}>
                  {t('admin.academicSetup.guided.viewLinkedItems')}
                </Link>
              )}
              <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
                {t('common.close')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">{t('admin.academicSetup.guided.removeLevelEmptyDesc')}</p>
            <div className="row mt-2" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--sm"
                style={{ background: '#b91c1c', color: '#fff' }}
                disabled={saving}
                onClick={handleConfirm}
              >
                {saving ? t('common.saving') : t('admin.academicSetup.guided.removeLevelConfirm')}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={saving}>
                {t('common.cancel')}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
