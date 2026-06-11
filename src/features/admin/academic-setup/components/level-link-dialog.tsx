'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { ReferenceLevelOption } from '@/types/academic-levels';
import { linkLegacySchoolLevel } from '../hooks/use-level-actions';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import { resolveReferenceLevelState } from '../utils/level-link-status';

export function LevelLinkDialog({
  level,
  open,
  onClose,
  onLinked,
}: {
  level: ReferenceLevelOption | null;
  open: boolean;
  onClose: () => void;
  onLinked: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const [saving, setSaving] = useState(false);

  if (!open || !level) return null;

  const state = resolveReferenceLevelState(level);

  async function handleConfirm() {
    if (state.schoolLevelId == null) return;
    setSaving(true);
    const res = await linkLegacySchoolLevel(state.schoolLevelId, level!.id, activeSchoolId);
    setSaving(false);

    if (!res.ok) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'level'));
      return;
    }

    if (res.data.action === 'already_linked') {
      toast.success(t('admin.academicSetup.guided.linkLevelAlreadyLinked'));
    } else {
      toast.success(t('admin.academicSetup.guided.linkLevelSuccess'));
    }

    onLinked();
    onClose();
  }

  return (
    <>
      <div className="academic-setup-drawer-backdrop" role="presentation" onClick={onClose} />
      <aside
        className="academic-setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-link-title"
      >
        <h2 id="level-link-title" className="admin-section__title">
          {t('admin.academicSetup.guided.linkLevelTitle')}
        </h2>
        <p className="muted">{t('admin.academicSetup.guided.linkLevelConfirm')}</p>
        <div className="row mt-2" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={saving}
            onClick={handleConfirm}
          >
            {saving ? t('common.saving') : t('admin.academicSetup.guided.completeLinkAction')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
        </div>
      </aside>
    </>
  );
}
