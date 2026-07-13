'use client';

/**
 * Read-only Teacher Academic Context summary — assignment-scoped options only.
 * Does not add school-wide subject selectors or Admin fallback.
 */

import { PermissionDeniedState, LoadingState, EmptyState, ApiErrorView } from '@/components/states/states';
import { useAcademicContextOptions } from '@/features/academic-context';
import {
  formatEffectiveSubjectLabel,
  formatLanguageOptionLabel,
  formatOfferingContextLabel,
  formatReferenceContextLabel,
} from '@/features/academic-context/utils/academic-context-display';
import { useT } from '@/features/i18n/locale-context';
import type { AcademicContextScope } from '@/types/academic-context';
import './teacher-assignment-scope.css';

export type TeacherAssignmentScopePanelProps = {
  scope?: AcademicContextScope;
  classId?: string;
  levelId?: string;
  subjectId?: string;
  /** When false, panel stays mounted but does not fetch. */
  enabled?: boolean;
};

export function TeacherAssignmentScopePanel({
  scope = 'timetable',
  classId,
  levelId,
  subjectId,
  enabled = true,
}: TeacherAssignmentScopePanelProps) {
  const t = useT();
  const ctx = useAcademicContextOptions({
    audience: 'teacher',
    scope,
    enabled,
    initialSelection: {
      classId: classId ?? '',
      levelId: levelId ?? '',
      subjectId: subjectId ?? '',
    },
  });

  const denied =
    ctx.permissionDenied ||
    ctx.error?.code === 'permission_denied' ||
    ctx.error?.code === 'forbidden';

  if (denied) {
    return (
      <PermissionDeniedState
        title={t('errors.forbiddenTitle')}
        description={t('academicContext.permissionDenied')}
      />
    );
  }

  if (ctx.loading && !ctx.options) {
    return <LoadingState label={t('academicContext.loading')} />;
  }

  if (ctx.error) {
    return (
      <ApiErrorView
        error={ctx.error}
        onRetry={() => ctx.refetch()}
      />
    );
  }

  const subjects = ctx.options?.subjects ?? [];
  const offerings = ctx.options?.offerings ?? [];
  const references = ctx.options?.references ?? [];

  if (subjects.length === 0 && offerings.length === 0) {
    return (
      <EmptyState
        icon="📚"
        title={t('academicContext.teacherScope.emptyTitle')}
        description={t('academicContext.teacherScope.emptyDescription')}
      />
    );
  }

  return (
    <section
      className="teacher-assignment-scope"
      aria-label={t('academicContext.teacherScope.title')}
    >
      <h2 className="teacher-assignment-scope__title" dir="auto">
        {t('academicContext.teacherScope.title')}
      </h2>
      <p className="muted tiny" dir="auto">
        {t('academicContext.teacherScope.subtitle')}
      </p>
      {ctx.refetching ? (
        <p className="muted tiny" role="status">
          {t('academicContext.refetching')}
        </p>
      ) : null}

      <div className="teacher-assignment-scope__groups">
        <div>
          <h3 className="tiny muted" dir="auto">
            {t('academicContext.fields.subject')}
          </h3>
          <ul className="teacher-assignment-scope__list">
            {subjects.map((subject) => {
              const label = formatEffectiveSubjectLabel(subject);
              return (
                <li key={subject.id} dir="auto">
                  {label.primary}
                  {label.secondary ? (
                    <span className="muted tiny"> · {label.secondary}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="tiny muted" dir="auto">
            {t('academicContext.fields.offering')}
          </h3>
          <ul className="teacher-assignment-scope__list">
            {offerings.map((offering) => {
              const label = formatOfferingContextLabel(offering);
              const language = offering.teaching_language
                ? formatLanguageOptionLabel(offering.teaching_language)
                : null;
              return (
                <li key={offering.id} dir="auto">
                  {label}
                  {language ? <span className="muted tiny"> · {language}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>

        {references.length > 0 ? (
          <div>
            <h3 className="tiny muted" dir="auto">
              {t('academicContext.fields.reference')}
            </h3>
            <ul className="teacher-assignment-scope__list">
              {references.map((reference) => {
                const label = formatReferenceContextLabel(reference);
                return (
                  <li key={reference.id} dir="auto">
                    {label.primary}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
