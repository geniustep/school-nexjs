'use client';

import { useMemo } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useT } from '@/features/i18n/locale-context';
import type { Level, Subject } from '@/types/class';
import { getSubjectEnablementWriteCapability } from '@/types/subject-enablement';
import { buildSubjectEnabledLevelSummaries } from '../utils/build-enablement-matrix';

export function SubjectLevelsEnablementDrawer({
  open,
  subject,
  levels,
  onClose,
}: {
  open: boolean;
  subject: Subject | null;
  levels: Level[];
  onClose: () => void;
}) {
  const t = useT();
  const write = getSubjectEnablementWriteCapability();

  const summary = useMemo(() => {
    if (!subject) return null;
    return buildSubjectEnabledLevelSummaries([subject], levels).get(subject.id) ?? null;
  }, [subject, levels]);

  const enabledSet = useMemo(
    () => new Set(summary?.enabledLevelIds ?? []),
    [summary],
  );

  const title = subject
    ? t('admin.subjectEnablement.manageSubjectLevelsTitle', { subject: subject.name })
    : t('admin.subjectEnablement.manageSubjectLevelsFallback');

  return (
    <SetupDrawer open={open && subject != null} title={title} onClose={onClose}>
      {!write.canManageOperationalEnablementMatrix && (
        <div className="academic-setup-gap-banner" role="status">
          <p>
            <strong>{t('admin.subjectEnablement.readOnlyTitle')}</strong>
          </p>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            {t('admin.subjectEnablement.readOnlyHint')}
          </p>
        </div>
      )}

      {subject ? (
        <p className="tiny muted mono" dir="ltr" style={{ marginTop: 8 }}>
          {subject.code || '—'}
        </p>
      ) : null}

      <p className="tiny muted" style={{ marginTop: 8 }}>
        {t('admin.subjectEnablement.enabledLevelsCount', {
          count: summary?.enabledCount ?? 0,
        })}
      </p>

      <div className="col" style={{ gap: 6, marginTop: 12, maxHeight: 360, overflow: 'auto' }}>
        {levels.map((level) => {
          const enabled = enabledSet.has(level.id);
          return (
            <div
              key={level.id}
              className="row"
              style={{ gap: 10, justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span className="col" style={{ gap: 2 }}>
                <span dir="auto">{level.name}</span>
                {level.code ? (
                  <span className="tiny muted mono" dir="ltr">
                    {level.code}
                  </span>
                ) : null}
              </span>
              <span className="tiny">
                {enabled
                  ? t('admin.subjectEnablement.statusEnabled')
                  : t('admin.subjectEnablement.statusNotEnabled')}
              </span>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </SetupDrawer>
  );
}
