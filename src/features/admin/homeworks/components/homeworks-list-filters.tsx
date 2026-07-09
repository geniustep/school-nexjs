'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { HomeworksListSearchField } from './homeworks-list-search-field';
import { HOMEWORK_LIST_STATES } from '@/features/admin/homeworks/utils/homeworks-list-present';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';

export function HomeworksListFilters({
  search,
  classId,
  stateFilter,
  classes,
  hasActiveFilters,
  onSearchChange,
  onSearchClear,
  onClassIdChange,
  onStateFilterChange,
  onReset,
}: {
  search: string;
  classId: string;
  stateFilter: string;
  classes: SchoolClass[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onClassIdChange: (value: string) => void;
  onStateFilterChange: (value: string) => void;
  onReset: () => void;
}) {
  const t = useT();

  const selectedClassLabel = classId
    ? (classes.find((item) => String(item.id) === classId)?.name ?? null)
    : null;

  const selectedStateLabel = stateFilter ? t(`states.${stateFilter}`) : null;

  return (
    <div className="homeworks-list-filters">
      <div className="homeworks-list-filters__primary">
        <HomeworksListSearchField
          value={search}
          onChange={onSearchChange}
          onClear={onSearchClear}
          placeholder={t('admin.searchHomework')}
          label={t('admin.searchHomework')}
        />

        <select
          className="input homeworks-list-filters__class"
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
          className="input homeworks-list-filters__state"
          value={stateFilter}
          onChange={(event) => onStateFilterChange(event.target.value)}
          aria-label={t('academic.status')}
        >
          <option value="">{t('admin.allStates')}</option>
          {HOMEWORK_LIST_STATES.map((state) => (
            <option key={state} value={state}>
              {t(`states.${state}`)}
            </option>
          ))}
        </select>

        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
            {t('admin.homeworksList.resetFilters')}
          </button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="homeworks-list-filters__chips" aria-live="polite">
          {search.trim() ? (
            <button
              type="button"
              className="homeworks-list-filters__chip homeworks-list-filters__chip--action"
              onClick={onSearchClear}
            >
              {t('admin.homeworksList.filters.chipSearch', { query: search.trim() })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedClassLabel ? (
            <button
              type="button"
              className="homeworks-list-filters__chip homeworks-list-filters__chip--action"
              onClick={() => onClassIdChange('')}
            >
              {t('admin.homeworksList.filters.chipClass', { className: selectedClassLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedStateLabel ? (
            <button
              type="button"
              className="homeworks-list-filters__chip homeworks-list-filters__chip--action"
              onClick={() => onStateFilterChange('')}
            >
              {t('admin.homeworksList.filters.chipStatus', { status: selectedStateLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
