'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { SubjectLevelGroup } from '../types';

export function SubjectsByLevel({ groups }: { groups: SubjectLevelGroup[] }) {
  const t = useT();

  if (!groups.length) {
    return <p className="muted">{t('admin.noSubjects')}</p>;
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      {groups.map((group) => (
        <div key={`${group.levelId}-${group.levelName}`} className="academic-setup-level">
          <div className="academic-setup-level__head" style={{ cursor: 'default' }}>
            <span>
              <strong>{group.levelName}</strong>
              <span className="tiny muted">
                {' '}
                · {t('admin.academicSetup.subjectsActive', { count: group.subjects.length })}
              </span>
            </span>
          </div>
          <div className="academic-setup-level__body">
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {group.subjects.map((subject) => (
                <Badge key={subject.id} tone="blue">
                  {subject.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ))}
      <p className="academic-setup-gap-banner">{t('admin.academicSetup.tracksReadOnlyGap')}</p>
    </div>
  );
}
