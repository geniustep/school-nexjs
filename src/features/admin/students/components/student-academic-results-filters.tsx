/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useT } from '@/features/i18n/locale-context';
import type { Ref } from '@/types/api';
import type { GradebookTermOption } from '@/types/gradebook';

export function StudentAcademicResultsFilters({
  academicYearId,
  termId,
  academicYears,
  terms,
  onAcademicYearIdChange,
  onTermIdChange,
}: {
  academicYearId: string;
  termId: string;
  academicYears: Ref[];
  terms: GradebookTermOption[];
  onAcademicYearIdChange: (value: string) => void;
  onTermIdChange: (value: string) => void;
}) {
  const t = useT();
  const yearSelected = Boolean(academicYearId);

  return (
    <div className="student-academic-results-filters toolbar" data-testid="student-academic-results-filters">
      <label className="field field--inline">
        <span className="student-academic-results-filters__label">
          {t('admin.student360.academic.filters.academicYear')}
        </span>
        <select
          className="input"
          value={academicYearId}
          onChange={(event) => onAcademicYearIdChange(event.target.value)}
          aria-label={t('admin.student360.academic.filters.academicYear')}
          data-testid="student-academic-year-select"
        >
          <option value="">{t('admin.student360.academic.filters.selectAcademicYear')}</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field field--inline">
        <span className="student-academic-results-filters__label">
          {t('admin.student360.academic.filters.term')}
        </span>
        <select
          className="input"
          value={termId}
          disabled={!yearSelected}
          onChange={(event) => onTermIdChange(event.target.value)}
          aria-label={t('admin.student360.academic.filters.term')}
          data-testid="student-academic-term-select"
        >
          <option value="">{t('admin.student360.academic.filters.selectTerm')}</option>
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
