'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { Level } from '@/types/class';
import type { SchoolLevelUsage } from '@/types/academic-levels';
import { fetchSchoolLevelDetail, removeSchoolLevel } from '../hooks/use-level-actions';
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
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Level | null>(null);
  const [usage, setUsage] = useState<SchoolLevelUsage>(() => resolveLevelRemovalFlags(level).usage);
  const [blocked, setBlocked] = useState(false);

  const activeLevel = detail ?? level;
  const flags = resolveLevelRemovalFlags(activeLevel);
  const usageLines = formatUsageLines(usage, t);
  const linkedRoute = primaryLinkedItemsRoute(activeLevel.id, usage);
  const showBlocked = blocked || flags.blockedByBackend;
  const showHistorical = !showBlocked && flags.isHistorical;

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setBlocked(false);
      return;
    }

    const initial = resolveLevelRemovalFlags(level);
    setUsage(initial.usage);
    setBlocked(initial.blockedByBackend);
    setLoading(true);
    setDetail(null);

    let cancelled = false;
    void (async () => {
      const res = await fetchSchoolLevelDetail(level.id, activeSchoolId);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setDetail(res.data);
        const fetched = resolveLevelRemovalFlags(res.data);
        setUsage(fetched.usage);
        setBlocked(fetched.blockedByBackend);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, level, activeSchoolId]);

  if (!open) return null;

  async function handleConfirm() {
    setSaving(true);
    const res = await removeSchoolLevel(level.id, activeSchoolId);
    setSaving(false);

    if (!res.ok) {
      const merged = mergeUsageFromError(activeLevel, res.error);
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
      <div className="academic-setup-drawer-backdrop" role="presentation" onClick={saving ? undefined : onClose} />
      <aside
        className="academic-setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-remove-title"
      >
        <h2 id="level-remove-title" className="admin-section__title">
          {t('admin.academicSetup.guided.removeLevelTitle')}
        </h2>

        {loading ? (
          <div className="academic-setup-dialog-skeleton" aria-busy="true" aria-live="polite">
            <div className="academic-setup-skeleton academic-setup-skeleton--bar" />
            <div className="academic-setup-skeleton academic-setup-skeleton--bar" style={{ width: '60%' }} />
          </div>
        ) : showBlocked ? (
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
            <p className="muted">
              {showHistorical
                ? t('admin.academicSetup.guided.removeLevelHistoricalDesc')
                : t('admin.academicSetup.guided.removeLevelEmptyDesc')}
            </p>
            {usageLines.length > 0 && (
              <ul className="academic-setup-usage-list">
                {usageLines.map((line) => (
                  <li key={line.key}>{line.label}</li>
                ))}
              </ul>
            )}
            <div className="row mt-2" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--sm"
                style={{ background: '#b91c1c', color: '#fff' }}
                disabled={saving}
                onClick={handleConfirm}
              >
                {saving
                  ? t('common.saving')
                  : showHistorical
                    ? t('admin.academicSetup.guided.deactivateLevelConfirm')
                    : t('admin.academicSetup.guided.removeLevelConfirm')}
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
