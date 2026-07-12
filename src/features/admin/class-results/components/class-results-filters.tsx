/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useT } from '@/features/i18n/locale-context';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import type { GradebookTermOption } from '@/types/gradebook';

export function ClassResultsFilters({
  academicYearId,
  termId,
  classId,
  academicYears,
  terms,
  classes,
  onAcademicYearIdChange,
  onTermIdChange,
  onClassIdChange,
  onReset,
  hasSelection,
}: {
  academicYearId: string;
  termId: string;
  classId: string;
  academicYears: Ref[];
  terms: GradebookTermOption[];
  classes: SchoolClass[];
  onAcademicYearIdChange: (value: string) => void;
  onTermIdChange: (value: string) => void;
  onClassIdChange: (value: string) => void;
  onReset: () => void;
  hasSelection: boolean;
}) {
  const t = useT();
  const yearSelected = Boolean(academicYearId);
  const termSelected = Boolean(termId);

  return (
    <div className="class-results-filters toolbar" data-testid="class-results-filters">
      <label className="field field--inline">
        <span className="class-results-filters__label">{t('admin.classResults.filters.academicYear')}</span>
        <select
          className="input"
          value={academicYearId}
          onChange={(event) => onAcademicYearIdChange(event.target.value)}
          aria-label={t('admin.classResults.filters.academicYear')}
        >
          <option value="">{t('admin.classResults.filters.selectAcademicYear')}</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field field--inline">
        <span className="class-results-filters__label">{t('admin.classResults.filters.term')}</span>
        <select
          className="input"
          value={termId}
          disabled={!yearSelected}
          onChange={(event) => onTermIdChange(event.target.value)}
          aria-label={t('admin.classResults.filters.term')}
        >
          <option value="">{t('admin.classResults.filters.selectTerm')}</option>
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field field--inline">
        <span className="class-results-filters__label">{t('admin.classResults.filters.class')}</span>
        <select
          className="input"
          value={classId}
          disabled={!yearSelected || !termSelected}
          onChange={(event) => onClassIdChange(event.target.value)}
          aria-label={t('admin.classResults.filters.class')}
        >
          <option value="">{t('admin.classResults.filters.selectClass')}</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </label>

      {hasSelection ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
          {t('admin.classResults.filters.reset')}
        </button>
      ) : null}
    </div>
  );
}
