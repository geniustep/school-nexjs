'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { EXAM_LIST_STATES } from '@/features/admin/exams/utils/exams-list-present';
import { AcademicContextFilters } from '@/features/academic-context';
import {
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
} from '@/features/academic-context/utils/academic-context-reset';
import { useT } from '@/features/i18n/locale-context';
import { useEffect, useState } from 'react';
import type { AcademicContextSelection } from '@/types/academic-context';
import type { SchoolClass } from '@/types/class';

export function ExamsListFilters({
  classId,
  academicYearId,
  termId,
  stateFilter,
  classes,
  hasActiveFilters,
  onClassIdChange,
  onAcademicYearIdChange,
  onTermIdChange,
  onStateFilterChange,
  onReset,
}: {
  classId: string;
  academicYearId?: string;
  termId?: string;
  stateFilter: string;
  classes: SchoolClass[];
  hasActiveFilters: boolean;
  onClassIdChange: (value: string) => void;
  onAcademicYearIdChange?: (value: string) => void;
  onTermIdChange?: (value: string) => void;
  onStateFilterChange: (value: string) => void;
  onReset: () => void;
}) {
  const t = useT();
  const [selection, setSelection] = useState<AcademicContextSelection>({
    ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
    classId,
    academicYearId: academicYearId ?? '',
    termId: termId ?? '',
  });

  useEffect(() => {
    setSelection((prev) => ({
      ...prev,
      classId,
      academicYearId: academicYearId ?? '',
      termId: termId ?? '',
    }));
  }, [classId, academicYearId, termId]);

  const selectedClassLabel = classId
    ? (classes.find((item) => String(item.id) === classId)?.name ?? null)
    : null;
  const selectedStateLabel = stateFilter ? t(`states.${stateFilter}`) : null;

  return (
    <div className="exams-list-filters">
      <AcademicContextFilters
        scope="exam"
        layout="compact"
        selection={selection}
        onSelectionChange={(next) => {
          setSelection(next);
          if (next.classId !== classId) onClassIdChange(next.classId);
          if (onAcademicYearIdChange && next.academicYearId !== (academicYearId ?? '')) {
            onAcademicYearIdChange(next.academicYearId);
          }
          if (onTermIdChange && next.termId !== (termId ?? '')) {
            onTermIdChange(next.termId);
          }
        }}
        showAcademicYear={false}
        showTerm
        showCycle={false}
        showLevel={false}
        showTrack={false}
        showClass
        showSubject={false}
        showTeachingLanguage={false}
        showOffering={false}
        showReference={false}
      />

      <div className="exams-list-filters__primary">
        <select
          className="input exams-list-filters__state"
          value={stateFilter}
          onChange={(event) => onStateFilterChange(event.target.value)}
          aria-label={t('academic.status')}
        >
          <option value="">{t('admin.allStates')}</option>
          {EXAM_LIST_STATES.map((state) => (
            <option key={state} value={state}>
              {t(`states.${state}`)}
            </option>
          ))}
        </select>

        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
            {t('admin.examsList.resetFilters')}
          </button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="exams-list-filters__chips" aria-live="polite">
          {selectedClassLabel ? (
            <button
              type="button"
              className="exams-list-filters__chip exams-list-filters__chip--action"
              onClick={() => onClassIdChange('')}
            >
              {t('admin.examsList.filters.chipClass', { className: selectedClassLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedStateLabel ? (
            <button
              type="button"
              className="exams-list-filters__chip exams-list-filters__chip--action"
              onClick={() => onStateFilterChange('')}
            >
              {t('admin.examsList.filters.chipStatus', { status: selectedStateLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
