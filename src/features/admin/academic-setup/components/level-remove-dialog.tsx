'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { Level } from '@/types/class';
import { removeSchoolLevel } from '../hooks/use-level-actions';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import {
  levelHasOperationalUsage,
  resolveLevelRemovalFlags,
  resolveLevelUsage,
} from '../utils/level-usage';

function usageLines(
  level: Level,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string[] {
  const usage = resolveLevelUsage(level);
  const lines: string[] = [];
  if (usage.classes > 0) lines.push(t('admin.academicSetup.guided.usageClasses', { count: usage.classes }));
  if (usage.subjects > 0) lines.push(t('admin.academicSetup.guided.usageSubjects', { count: usage.subjects }));
  if (usage.tracks > 0) lines.push(t('admin.academicSetup.guided.usageTracks', { count: usage.tracks }));
  if (usage.students > 0) lines.push(t('admin.academicSetup.guided.usageStudents', { count: usage.students }));
  if (usage.assignments > 0) {
    lines.push(t('admin.academicSetup.guided.usageAssignments', { count: usage.assignments }));
  }
  return lines;
}

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
  const { canDelete, usage } = resolveLevelRemovalFlags(level);
  const inUse = levelHasOperationalUsage(usage);
  const usageDetail = usageLines(level, t);

  if (!open) return null;

  async function handleConfirm() {
    setSaving(true);
    const res = await removeSchoolLevel(level.id, activeSchoolId);
    setSaving(false);

    if (!res.ok) {
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

        {inUse || !canDelete ? (
          <>
            <p>{t('admin.academicSetup.guided.levelInUseBlocked')}</p>
            {usageDetail.length > 0 && (
              <ul className="academic-setup-usage-list">
                {usageDetail.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            <div className="row mt-2" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Link
                href={`/admin/settings/academic-setup/classes?level=${level.id}`}
                className="btn btn--primary btn--sm"
                onClick={onClose}
              >
                {t('admin.academicSetup.guided.viewLinkedItems')}
              </Link>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
                {t('common.cancel')}
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
