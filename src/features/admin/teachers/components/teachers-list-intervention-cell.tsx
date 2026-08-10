'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  deriveTeacherInterventions,
  getTeacherPrimaryIntervention,
  interventionActionKey,
  interventionPriorityLabelKey,
  interventionTitleKey,
  type TeacherIntervention,
} from '@/features/admin/teachers/utils/teacher-interventions';
import type { TeacherSummary } from '@/types/teacher-domain';

function priorityTone(priority: TeacherIntervention['priority']): 'amber' | 'slate' | 'red' {
  if (priority === 'P1') return 'amber';
  if (priority === 'P2') return 'slate';
  return 'slate';
}

export function TeachersListInterventionCell({ teacher }: { teacher: TeacherSummary }) {
  const t = useT();
  const interventions = deriveTeacherInterventions(teacher);
  const primary = getTeacherPrimaryIntervention(teacher);

  if (!primary) return null;

  const extra = Math.max(0, interventions.length - 1);
  const extraSummary = interventions
    .slice(1)
    .map((item) => t(interventionTitleKey(item.code)))
    .join('؛ ');

  return (
    <div className="teachers-list__intervention">
      <div className="teachers-list__intervention-main">
        <Badge tone={priorityTone(primary.priority)}>
          {t(interventionPriorityLabelKey(primary.priority))}
        </Badge>
        <span className="teachers-list__intervention-title" dir="auto">
          {t(interventionTitleKey(primary.code))}
        </span>
      </div>
      {extra > 0 ? (
        <details className="teachers-list__intervention-more">
          <summary>{t('admin.teacherDomain.interventions.moreReasons', { count: extra })}</summary>
          <ul className="teachers-list__intervention-list">
            {interventions.slice(1).map((item) => (
              <li key={item.code}>{t(interventionTitleKey(item.code))}</li>
            ))}
          </ul>
          <span className="teachers-list-search__sr-only">{extraSummary}</span>
        </details>
      ) : null}
      <Link
        href={primary.targetPath}
        className="teachers-list__intervention-link"
        onClick={(event) => event.stopPropagation()}
      >
        {t(interventionActionKey(primary.code))}
      </Link>
    </div>
  );
}
