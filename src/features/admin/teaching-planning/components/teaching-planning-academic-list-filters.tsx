'use client';

/**
 * Shared list filters: search + state + Academic Context (cycle/level/track/subject).
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useState } from 'react';
import { AcademicContextFilters } from '@/features/academic-context';
import {
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
} from '@/features/academic-context/utils/academic-context-reset';
import { TeachingPlanningListSearch } from '@/features/admin/teaching-planning/components/teaching-planning-list-search';
import { useT } from '@/features/i18n/locale-context';
import type { AcademicContextSelection } from '@/types/academic-context';

export function TeachingPlanningAcademicListFilters({
  search,
  stateFilter,
  levelId,
  subjectId,
  stateOptions,
  hasActiveFilters,
  onSearchChange,
  onSearchClear,
  onStateFilterChange,
  onLevelIdChange,
  onSubjectIdChange,
  onReset,
  selectedStateLabel,
}: {
  search: string;
  stateFilter: string;
  levelId: string;
  subjectId: string;
  stateOptions: Array<{ value: string; label: string }>;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onStateFilterChange: (value: string) => void;
  onLevelIdChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  onReset: () => void;
  selectedStateLabel?: string | null;
}) {
  const t = useT();
  const [selection, setSelection] = useState<AcademicContextSelection>({
    ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
    levelId,
    subjectId,
  });

  useEffect(() => {
    setSelection((prev) => ({
      ...prev,
      levelId,
      subjectId,
    }));
  }, [levelId, subjectId]);

  return (
    <div className="tp-list-filters">
      <div className="tp-list-filters__primary">
        <TeachingPlanningListSearch
          value={search}
          onChange={onSearchChange}
          onClear={onSearchClear}
          placeholder={t('admin.teachingPlanning.filters.searchPlaceholder')}
          label={t('admin.teachingPlanning.filters.searchPlaceholder')}
        />

        <select
          className="select"
          value={stateFilter}
          onChange={(event) => onStateFilterChange(event.target.value)}
          aria-label={t('admin.teachingPlanning.columns.state')}
        >
          <option value="">{t('admin.teachingPlanning.filters.stateAll')}</option>
          {stateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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

      {hasActiveFilters ? (
        <div className="tp-list-filters__chips" aria-live="polite">
          {search.trim() ? (
            <button
              type="button"
              className="tp-list-filters__chip tp-list-filters__chip--action"
              onClick={onSearchClear}
            >
              {t('admin.teachingPlanning.filters.chipSearch', { query: search.trim() })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedStateLabel ? (
            <button
              type="button"
              className="tp-list-filters__chip tp-list-filters__chip--action"
              onClick={() => onStateFilterChange('')}
            >
              {t('admin.teachingPlanning.filters.chipState', { status: selectedStateLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
