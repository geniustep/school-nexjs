'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadinessIssue } from '@/types/academic-setup';
import type { SubjectLevelGroup } from '../types';

function subjectHasAssignmentGap(
  subjectId: number,
  issues: SetupReadinessIssue[],
): boolean {
  return issues.some(
    (i) =>
      i.code === 'assignment_missing' &&
      (i.entity?.type === 'subject' ? Number(i.entity.id) === subjectId : false),
  );
}

export function SubjectsByLevel({
  groups,
  readinessIssues = [],
}: {
  groups: SubjectLevelGroup[];
  readinessIssues?: SetupReadinessIssue[];
}) {
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
            <ul className="academic-setup-ref-levels" role="list">
              {[...group.subjects]
                .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || a.name.localeCompare(b.name))
                .map((subject) => {
                  const missingAssignment = subjectHasAssignmentGap(subject.id, readinessIssues);
                  return (
                    <li key={subject.id}>
                      <div className="academic-setup-ref-level">
                        <span className="academic-setup-ref-level__main">
                          <strong>{subject.name}</strong>
                          {subject.code && (
                            <span className="tiny muted block">{subject.code}</span>
                          )}
                          <span className="row mt-2" style={{ gap: 6, flexWrap: 'wrap' }}>
                            {subject.required && (
                              <Badge tone="blue">{t('admin.academicSetup.guided.badgeRequired')}</Badge>
                            )}
                            {subject.optional && (
                              <Badge tone="slate">{t('admin.academicSetup.guided.badgeOptional')}</Badge>
                            )}
                            {subject.source === 'level' && (
                              <Badge tone="slate">{t('admin.academicSetup.guided.badgeLevelSubject')}</Badge>
                            )}
                            {subject.source === 'track' && (
                              <Badge tone="blue">{t('admin.academicSetup.guided.badgeTrackSubject')}</Badge>
                            )}
                            {subject.weekly_hours != null && subject.weekly_hours > 0 && (
                              <Badge tone="slate">
                                {t('admin.academicSetup.guided.weeklySessions', {
                                  count: subject.weekly_hours,
                                })}
                              </Badge>
                            )}
                            {missingAssignment && (
                              <Badge tone="amber">
                                {t('admin.academicSetup.guided.assignmentMissingBadge')}
                              </Badge>
                            )}
                            {subject.assignments_count != null && subject.assignments_count > 0 && (
                              <Badge tone="green">
                                {t('admin.academicSetup.guided.assignmentsCount', {
                                  count: subject.assignments_count,
                                })}
                              </Badge>
                            )}
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
