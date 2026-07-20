'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { TeachersListSearchField } from '@/features/admin/teachers/components/teachers-list-search-field';
import { useT } from '@/features/i18n/locale-context';

const EMPLOYMENT_STATES = ['active', 'terminated', 'archived'] as const;

export function TeachersListFilters({
  search,
  stateFilter,
  activeFilter,
  hasAssignments,
  hasActiveFilters,
  onSearchChange,
  onSearchClear,
  onStateFilterChange,
  onActiveFilterChange,
  onHasAssignmentsChange,
  onReset,
}: {
  search: string;
  stateFilter: string;
  activeFilter: string;
  hasAssignments: string;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onStateFilterChange: (value: string) => void;
  onActiveFilterChange: (value: string) => void;
  onHasAssignmentsChange: (value: string) => void;
  onReset: () => void;
}) {
  const t = useT();

  const stateLabel = EMPLOYMENT_STATES.includes(
    stateFilter as (typeof EMPLOYMENT_STATES)[number],
  )
    ? t(`admin.teacherDomain.states.${stateFilter}`)
    : null;

  const activeLabel =
    activeFilter === 'true'
      ? t('admin.teacherDomain.filters.activeYes')
      : activeFilter === 'false'
        ? t('admin.teacherDomain.filters.activeNo')
        : null;

  const assignmentsLabel =
    hasAssignments === 'true'
      ? t('admin.teacherDomain.filters.assignmentsYes')
      : hasAssignments === 'false'
        ? t('admin.teacherDomain.filters.assignmentsNo')
        : null;

  return (
    <div className="teachers-list-filters" role="search">
      <div className="teachers-list-filters__primary">
        <div className="teachers-list-filters__field teachers-list-filters__field--search">
          <span className="teachers-list-filters__label">
            {t('admin.teacherDomain.filters.search')}
          </span>
          <TeachersListSearchField
            value={search}
            onChange={onSearchChange}
            onClear={onSearchClear}
            placeholder={t('admin.teacherDomain.filters.searchPlaceholder')}
            label={t('admin.teacherDomain.filters.search')}
          />
        </div>

        <label className="teachers-list-filters__field">
          <span className="teachers-list-filters__label">
            {t('admin.teacherDomain.filters.state')}
          </span>
          <select
            className="input teachers-list-filters__select"
            value={stateFilter}
            onChange={(event) => onStateFilterChange(event.target.value)}
          >
            <option value="">{t('admin.teacherDomain.filters.allStates')}</option>
            {EMPLOYMENT_STATES.map((state) => (
              <option key={state} value={state}>
                {t(`admin.teacherDomain.states.${state}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="teachers-list-filters__field">
          <span className="teachers-list-filters__label">
            {t('admin.teacherDomain.filters.active')}
          </span>
          <select
            className="input teachers-list-filters__select"
            value={activeFilter}
            onChange={(event) => onActiveFilterChange(event.target.value)}
          >
            <option value="">{t('admin.teacherDomain.filters.allActive')}</option>
            <option value="true">{t('admin.teacherDomain.filters.activeYes')}</option>
            <option value="false">{t('admin.teacherDomain.filters.activeNo')}</option>
          </select>
        </label>

        <label className="teachers-list-filters__field">
          <span className="teachers-list-filters__label">
            {t('admin.teacherDomain.filters.hasAssignments')}
          </span>
          <select
            className="input teachers-list-filters__select"
            value={hasAssignments}
            onChange={(event) => onHasAssignmentsChange(event.target.value)}
          >
            <option value="">{t('admin.teacherDomain.filters.allAssignments')}</option>
            <option value="true">{t('admin.teacherDomain.filters.assignmentsYes')}</option>
            <option value="false">{t('admin.teacherDomain.filters.assignmentsNo')}</option>
          </select>
        </label>

        {hasActiveFilters ? (
          <div className="teachers-list-filters__reset">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
              {t('admin.teacherDomain.filters.reset')}
            </button>
          </div>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="teachers-list-filters__chips" aria-live="polite">
          {search.trim() ? (
            <button
              type="button"
              className="teachers-list-filters__chip teachers-list-filters__chip--action"
              onClick={onSearchClear}
            >
              {t('admin.teacherDomain.filters.chipSearch', { query: search.trim() })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {stateLabel ? (
            <button
              type="button"
              className="teachers-list-filters__chip teachers-list-filters__chip--action"
              onClick={() => onStateFilterChange('')}
            >
              {t('admin.teacherDomain.filters.chipState', { state: stateLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {activeLabel ? (
            <button
              type="button"
              className="teachers-list-filters__chip teachers-list-filters__chip--action"
              onClick={() => onActiveFilterChange('')}
            >
              {t('admin.teacherDomain.filters.chipActive', { value: activeLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {assignmentsLabel ? (
            <button
              type="button"
              className="teachers-list-filters__chip teachers-list-filters__chip--action"
              onClick={() => onHasAssignmentsChange('')}
            >
              {t('admin.teacherDomain.filters.chipHasAssignments', {
                value: assignmentsLabel,
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
