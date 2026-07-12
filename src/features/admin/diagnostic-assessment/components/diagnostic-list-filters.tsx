/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useT } from '@/features/i18n/locale-context';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import { DIAGNOSTIC_LIST_STATES } from '../utils/diagnostic-list-present';

export function DiagnosticListFilters({
  academicYearId,
  classId,
  subjectId,
  stateFilter,
  academicYears,
  classes,
  subjects,
  onAcademicYearChange,
  onClassChange,
  onSubjectChange,
  onStateChange,
  onReset,
}: {
  academicYearId: string;
  classId: string;
  subjectId: string;
  stateFilter: string;
  academicYears: Ref[];
  classes: SchoolClass[];
  subjects: Ref[];
  onAcademicYearChange: (value: string) => void;
  onClassChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onReset: () => void;
}) {
  const t = useT();

  return (
    <div className="diagnostic-list-filters">
      <label className="field">
        <span className="sr-only">{t('admin.diagnosticAssessment.academicYear')}</span>
        <select
          className="input"
          value={academicYearId}
          onChange={(event) => onAcademicYearChange(event.target.value)}
        >
          <option value="">{t('admin.diagnosticAssessment.filters.allYears')}</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="sr-only">{t('nav.classes')}</span>
        <select className="input" value={classId} onChange={(event) => onClassChange(event.target.value)}>
          <option value="">{t('admin.diagnosticAssessment.filters.allClasses')}</option>
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="sr-only">{t('nav.subjects')}</span>
        <select
          className="input"
          value={subjectId}
          onChange={(event) => onSubjectChange(event.target.value)}
        >
          <option value="">{t('admin.diagnosticAssessment.filters.allSubjects')}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="sr-only">{t('admin.diagnosticAssessment.state')}</span>
        <select
          className="input"
          value={stateFilter}
          onChange={(event) => onStateChange(event.target.value)}
        >
          <option value="">{t('admin.diagnosticAssessment.filters.allStates')}</option>
          {DIAGNOSTIC_LIST_STATES.map((state) => (
            <option key={state} value={state}>
              {t(`admin.diagnosticAssessment.states.${state}`)}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
        {t('admin.diagnosticAssessment.resetFilters')}
      </button>
    </div>
  );
}
