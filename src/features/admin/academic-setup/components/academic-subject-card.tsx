'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { Subject } from '@/types/class';

export function AcademicSubjectCard({
  subject,
  missingAssignment,
}: {
  subject: Subject;
  missingAssignment?: boolean;
}) {
  const t = useT();

  return (
    <article className="academic-subject-card">
      <div className="academic-subject-card__main">
        <strong className="academic-subject-card__name">{subject.name}</strong>
        {subject.code && <span className="academic-subject-card__code">{subject.code}</span>}
        <div className="academic-subject-card__meta">
          {subject.source === 'level' && (
            <span className="academic-subject-card__source">
              {t('admin.academicSetup.classSubjectSourceLevel')}
            </span>
          )}
          {subject.source === 'track' && (
            <span className="academic-subject-card__source academic-subject-card__source--track">
              {t('admin.academicSetup.classSubjectSourceTrack')}
            </span>
          )}
          {subject.source === 'class' && (
            <span className="academic-subject-card__source academic-subject-card__source--class">
              {t('admin.academicSetup.classSubjectSourceClass')}
            </span>
          )}
          {subject.required && (
            <span className="academic-subject-card__tag">{t('admin.academicSetup.guided.badgeRequired')}</span>
          )}
          {subject.optional && (
            <span className="academic-subject-card__tag academic-subject-card__tag--muted">
              {t('admin.academicSetup.guided.badgeOptional')}
            </span>
          )}
          {subject.weekly_hours != null && subject.weekly_hours > 0 && (
            <span className="academic-subject-card__tag academic-subject-card__tag--muted">
              {t('admin.academicSetup.guided.weeklySessions', { count: subject.weekly_hours })}
            </span>
          )}
        </div>
      </div>
      <div className="academic-subject-card__status">
        <Badge tone="green">{t('admin.academicSetup.subjectActive')}</Badge>
        {missingAssignment && (
          <Badge tone="amber">{t('admin.academicSetup.guided.assignmentMissingBadge')}</Badge>
        )}
      </div>
    </article>
  );
}
