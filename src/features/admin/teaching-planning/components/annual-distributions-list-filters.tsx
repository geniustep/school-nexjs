'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo } from 'react';
import { AnnualDistributionsListSearchField } from '@/features/admin/teaching-planning/components/annual-distributions-list-search-field';
import { DISTRIBUTION_STATE_OPTIONS } from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useT } from '@/features/i18n/locale-context';
import type { AcademicYearOption } from '@/lib/utils/academic-years';

function stateLabel(t: (key: string) => string, value: string): string {
  const global = t(`states.${value}`);
  if (global !== `states.${value}`) return global;
  return t(`admin.teachingPlanning.states.${value}`);
}

export function AnnualDistributionsListFilters({
  search,
  yearId,
  stateFilter,
  yearOptions,
  hasActiveFilters,
  onSearchChange,
  onSearchClear,
  onYearIdChange,
  onStateFilterChange,
  onReset,
}: {
  search: string;
  yearId: string;
  stateFilter: string;
  yearOptions: AcademicYearOption[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onYearIdChange: (value: string) => void;
  onStateFilterChange: (value: string) => void;
  onReset: () => void;
}) {
  const t = useT();

  const selectedYearLabel = useMemo(() => {
    if (!yearId) return null;
    return yearOptions.find((year) => String(year.id) === yearId)?.name ?? null;
  }, [yearId, yearOptions]);

  const selectedStateLabel = stateFilter ? stateLabel(t, stateFilter) : null;

  return (
    <div className="annual-distributions-list-filters">
      <div className="annual-distributions-list-filters__primary">
        <AnnualDistributionsListSearchField
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
          aria-label={t('admin.teachingPlanning.columns.state')}
        >
          <option value="">{t('admin.teachingPlanning.filters.stateAll')}</option>
          {DISTRIBUTION_STATE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {stateLabel(t, value)}
            </option>
          ))}
        </select>

        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
            {t('admin.teachingPlanning.filters.reset')}
          </button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="annual-distributions-list-filters__chips" aria-live="polite">
          {search.trim() ? (
            <button
              type="button"
              className="annual-distributions-list-filters__chip annual-distributions-list-filters__chip--action"
              onClick={onSearchClear}
            >
              {t('admin.teachingPlanning.filters.chipSearch', { query: search.trim() })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedYearLabel ? (
            <button
              type="button"
              className="annual-distributions-list-filters__chip annual-distributions-list-filters__chip--action"
              onClick={() => onYearIdChange('')}
            >
              {t('admin.teachingPlanning.filters.chipYear', { year: selectedYearLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedStateLabel ? (
            <button
              type="button"
              className="annual-distributions-list-filters__chip annual-distributions-list-filters__chip--action"
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
