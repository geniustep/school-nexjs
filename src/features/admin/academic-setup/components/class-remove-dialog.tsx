'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';
import type { SchoolClassUsage } from '@/types/class';
import { fetchSchoolClassDetail, removeSchoolClass } from '../hooks/use-class-actions';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import {
  formatClassUsageLines,
  mergeClassUsageFromError,
  resolveClassRemovalFlags,
} from '../utils/class-usage';

export function ClassRemoveDialog({
  cls,
  open,
  onClose,
  onRemoved,
}: {
  cls: SchoolClass;
  open: boolean;
  onClose: () => void;
  onRemoved: (action: 'deleted' | 'deactivated') => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SchoolClass | null>(null);
  const [usage, setUsage] = useState<SchoolClassUsage>(() => resolveClassRemovalFlags(cls).usage);
  const [blocked, setBlocked] = useState(false);

  const activeClass = detail ?? cls;
  const flags = resolveClassRemovalFlags(activeClass);
  const usageLines = formatClassUsageLines(usage, t);
  const showBlocked = blocked || flags.blockedByBackend;
  const showHistorical = !showBlocked && flags.isHistorical;

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setBlocked(false);
      return;
    }

    const initial = resolveClassRemovalFlags(cls);
    setUsage(initial.usage);
    setBlocked(initial.blockedByBackend);
    setLoading(true);
    setDetail(null);

    let cancelled = false;
    void (async () => {
      const res = await fetchSchoolClassDetail(cls.id, activeSchoolId);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setDetail(res.data);
        const fetched = resolveClassRemovalFlags(res.data);
        setUsage(fetched.usage);
        setBlocked(fetched.blockedByBackend);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, cls, activeSchoolId]);

  if (!open) return null;

  async function handleConfirm() {
    setSaving(true);
    const res = await removeSchoolClass(cls.id, activeSchoolId);
    setSaving(false);

    if (!res.ok) {
      const merged = mergeClassUsageFromError(activeClass, res.error);
      setUsage(merged);
      if (res.error.code === 'class_in_use') {
        setBlocked(true);
      }
      toast.error(mapAcademicSetupApiError(res.error, t, 'class'));
      return;
    }

    if (res.data.action === 'deleted') {
      toast.success(t('admin.academicSetup.guided.classDeleted'));
      onRemoved('deleted');
    } else if (res.data.action === 'deactivated') {
      toast.success(t('admin.academicSetup.guided.classDeactivated'));
      onRemoved('deactivated');
    } else {
      toast.error(t('admin.academicSetup.guided.classCannotRemove'));
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
        aria-labelledby="class-remove-title"
      >
        <h2 id="class-remove-title" className="admin-section__title">
          {t('admin.academicSetup.guided.removeClassTitle')}
        </h2>

        {loading ? (
          <div className="academic-setup-dialog-skeleton" aria-busy="true" aria-live="polite">
            <div className="academic-setup-skeleton academic-setup-skeleton--bar" />
            <div className="academic-setup-skeleton academic-setup-skeleton--bar" style={{ width: '60%' }} />
          </div>
        ) : showBlocked ? (
          <>
            <p>{t('admin.academicSetup.guided.classInUse')}</p>
            {usageLines.length > 0 && (
              <ul className="academic-setup-usage-list">
                {usageLines.map((line) => (
                  <li key={line.key}>{line.label}</li>
                ))}
              </ul>
            )}
            <div className="row mt-2" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
                {t('common.close')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              {showHistorical
                ? t('admin.academicSetup.guided.removeClassHistoricalDesc')
                : t('admin.academicSetup.guided.removeClassEmptyDesc')}
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
                    ? t('admin.academicSetup.guided.deactivateClassConfirm')
                    : t('admin.academicSetup.guided.removeClassConfirm')}
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
