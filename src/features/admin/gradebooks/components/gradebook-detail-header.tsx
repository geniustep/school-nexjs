/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { useT } from '@/features/i18n/locale-context';
import type { CompletionSummary, GradebookContext } from '@/types/gradebook';
import { formatCompletionSummary } from '../utils/gradebook-list-present';

export function GradebookDetailHeader({
  context,
  completion,
}: {
  context: GradebookContext;
  completion: CompletionSummary;
}) {
  const t = useT();

  return (
    <div className="gradebook-header card card--pad">
      <div className="gradebook-header__meta">
        <div className="gradebook-header__item">
          <span className="gradebook-header__label">{t('academic.subject')}</span>
          <strong>{context.subject?.name ?? t('common.dash')}</strong>
        </div>
        <div className="gradebook-header__item">
          <span className="gradebook-header__label">{t('nav.classes')}</span>
          <strong>{context.class?.name ?? t('common.dash')}</strong>
        </div>
        <div className="gradebook-header__item">
          <span className="gradebook-header__label">{t('admin.gradebooks.academicYear')}</span>
          <strong>{context.academic_year?.name ?? t('common.dash')}</strong>
        </div>
        <div className="gradebook-header__item">
          <span className="gradebook-header__label">{t('admin.gradebooks.term')}</span>
          <strong>{context.term?.name ?? t('common.dash')}</strong>
        </div>
        <div className="gradebook-header__item">
          <span className="gradebook-header__label">{t('nav.teachers')}</span>
          <strong>{context.teacher?.name ?? t('common.dash')}</strong>
        </div>
        <div className="gradebook-header__item">
          <span className="gradebook-header__label">{t('academic.status')}</span>
          <WorkflowBadge state={context.state} />
        </div>
        <div className="gradebook-header__item">
          <span className="gradebook-header__label">{t('admin.gradebooks.completion.label')}</span>
          <strong>{formatCompletionSummary(completion.completion_percent, completion.unresolved_entries, t)}</strong>
        </div>
      </div>
      <div className="gradebook-header__stats muted tiny">
        <span>
          {t('admin.gradebooks.completion.studentsTotal', { count: completion.students_total })}
        </span>
        <span>
          {t('admin.gradebooks.completion.cellsTotal', { count: completion.cells_total })}
        </span>
      </div>
    </div>
  );
}
