/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { GRADEBOOK_LIST_STATES } from '@/features/admin/gradebooks/utils/gradebook-list-present';
import { useT } from '@/features/i18n/locale-context';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';

export function GradebooksListFilters({
  academicYearId,
  termId,
  classId,
  subjectId,
  stateFilter,
  academicYears,
  terms,
  classes,
  subjects,
  hasActiveFilters,
  onAcademicYearIdChange,
  onTermIdChange,
  onClassIdChange,
  onSubjectIdChange,
  onStateFilterChange,
  onReset,
}: {
  academicYearId: string;
  termId: string;
  classId: string;
  subjectId: string;
  stateFilter: string;
  academicYears: Ref[];
  terms: Ref[];
  classes: SchoolClass[];
  subjects: Ref[];
  hasActiveFilters: boolean;
  onAcademicYearIdChange: (value: string) => void;
  onTermIdChange: (value: string) => void;
  onClassIdChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  onStateFilterChange: (value: string) => void;
  onReset: () => void;
}) {
  const t = useT();

  return (
    <div className="gradebooks-list-filters toolbar">
      <select
        className="input"
        value={academicYearId}
        onChange={(event) => onAcademicYearIdChange(event.target.value)}
        aria-label={t('admin.gradebooks.academicYear')}
      >
        <option value="">{t('admin.gradebooks.allAcademicYears')}</option>
        {academicYears.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name}
          </option>
        ))}
      </select>

      <select
        className="input"
        value={termId}
        onChange={(event) => onTermIdChange(event.target.value)}
        aria-label={t('admin.gradebooks.term')}
      >
        <option value="">{t('admin.gradebooks.allTerms')}</option>
        {terms.map((term) => (
          <option key={term.id} value={term.id}>
            {term.name}
          </option>
        ))}
      </select>

      <select
        className="input"
        value={classId}
        onChange={(event) => onClassIdChange(event.target.value)}
        aria-label={t('nav.classes')}
      >
        <option value="">{t('admin.allClasses')}</option>
        {classes.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {cls.name}
          </option>
        ))}
      </select>

      <select
        className="input"
        value={subjectId}
        onChange={(event) => onSubjectIdChange(event.target.value)}
        aria-label={t('academic.subject')}
      >
        <option value="">{t('admin.gradebooks.allSubjects')}</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </select>

      <select
        className="input"
        value={stateFilter}
        onChange={(event) => onStateFilterChange(event.target.value)}
        aria-label={t('academic.status')}
      >
        <option value="">{t('admin.allStates')}</option>
        {GRADEBOOK_LIST_STATES.map((state) => (
          <option key={state} value={state}>
            {t(`states.${state}`)}
          </option>
        ))}
      </select>

      {hasActiveFilters ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
          {t('admin.gradebooks.resetFilters')}
        </button>
      ) : null}
    </div>
  );
}
