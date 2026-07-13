'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useState } from 'react';
import { AcademicContextFilters } from '@/features/academic-context';
import {
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
} from '@/features/academic-context/utils/academic-context-reset';
import { TeachingOfferingsListSearchField } from '@/features/admin/teaching-planning/components/teaching-offerings-list-search-field';
import { TEACHING_PLANNING_STATE_OPTIONS } from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useT } from '@/features/i18n/locale-context';
import type { AcademicContextSelection } from '@/types/academic-context';
import type { AcademicYearOption } from '@/lib/utils/academic-years';

function stateLabel(t: (key: string) => string, value: string): string {
  const global = t(`states.${value}`);
  if (global !== `states.${value}`) return global;
  return t(`admin.teachingPlanning.states.${value}`);
}

export function TeachingOfferingsListFilters({
  search,
  yearId,
  stateFilter,
  levelId,
  subjectId,
  yearOptions,
  hasActiveFilters,
  onSearchChange,
  onSearchClear,
  onYearIdChange,
  onStateFilterChange,
  onLevelIdChange,
  onSubjectIdChange,
  onReset,
}: {
  search: string;
  yearId: string;
  stateFilter: string;
  levelId: string;
  subjectId: string;
  yearOptions: AcademicYearOption[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onYearIdChange: (value: string) => void;
  onStateFilterChange: (value: string) => void;
  onLevelIdChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  onReset: () => void;
}) {
  const t = useT();
  const [selection, setSelection] = useState<AcademicContextSelection>({
    ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
    academicYearId: yearId,
    levelId,
    subjectId,
  });

  useEffect(() => {
    setSelection((prev) => ({
      ...prev,
      academicYearId: yearId,
      levelId,
      subjectId,
    }));
  }, [yearId, levelId, subjectId]);

  const selectedStateLabel = stateFilter ? stateLabel(t, stateFilter) : null;

  return (
    <div className="teaching-offerings-list-filters">
      <div className="teaching-offerings-list-filters__primary">
        <TeachingOfferingsListSearchField
          value={search}
          onChange={onSearchChange}
          onClear={onSearchClear}
          placeholder={t('admin.teachingPlanning.filters.searchPlaceholder')}
          label={t('admin.teachingPlanning.filters.searchPlaceholder')}
        />

        <select
          className="select"
          value={yearId}
          onChange={(event) => onYearIdChange(event.target.value)}
          aria-label={t('admin.teachingPlanning.fields.academicYear')}
        >
          <option value="">{t('admin.teachingPlanning.filters.yearAll')}</option>
          {yearOptions.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>

        <select
          className="select"
          value={stateFilter}
          onChange={(event) => onStateFilterChange(event.target.value)}
          aria-label={t('admin.teachingPlanning.filters.state')}
        >
          <option value="">{t('admin.teachingPlanning.filters.stateAll')}</option>
          {TEACHING_PLANNING_STATE_OPTIONS.map((state) => (
            <option key={state} value={state}>
              {stateLabel(t, state)}
            </option>
          ))}
        </select>

        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
            {t('admin.teachingPlanning.filters.reset')}
          </button>
        ) : null}
      </div>

      <AcademicContextFilters
        scope="teaching_planning"
        layout="compact"
        selection={selection}
        onSelectionChange={(next) => {
          setSelection(next);
          if (next.academicYearId !== yearId) onYearIdChange(next.academicYearId);
          if (next.levelId !== levelId) onLevelIdChange(next.levelId);
          if (next.subjectId !== subjectId) onSubjectIdChange(next.subjectId);
        }}
        showAcademicYear={false}
        showTerm={false}
        showCycle
        showLevel
        showTrack
        showSubject
        showTeachingLanguage={false}
        showOffering={false}
        showReference={false}
        showClass={false}
      />

      {hasActiveFilters && selectedStateLabel ? (
        <div className="teaching-offerings-list-filters__chips" aria-live="polite">
          <span className="teaching-offerings-list-filters__chip">{selectedStateLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
