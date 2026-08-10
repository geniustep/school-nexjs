'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useState } from 'react';
import { TeachersListSearchField } from '@/features/admin/teachers/components/teachers-list-search-field';
import type { TeacherOperationalPreset } from '@/features/admin/teachers/utils/teacher-interventions';
import { useT } from '@/features/i18n/locale-context';

const EMPLOYMENT_STATES = ['active', 'terminated', 'archived'] as const;

const OPERATIONAL_PRESETS: TeacherOperationalPreset[] = [
  'all',
  'needs_intervention',
  'no_assignment',
  'inactive_account',
  'incomplete_academic_profile',
];

export function TeachersListFilters({
  search,
  stateFilter,
  activeFilter,
  hasAssignments,
  accountFilter,
  operationalPreset,
  hasActiveFilters,
  onSearchChange,
  onSearchClear,
  onStateFilterChange,
  onActiveFilterChange,
  onHasAssignmentsChange,
  onAccountFilterChange,
  onOperationalPresetChange,
  onReset,
}: {
  search: string;
  stateFilter: string;
  activeFilter: string;
  hasAssignments: string;
  accountFilter: string;
  operationalPreset: TeacherOperationalPreset;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onStateFilterChange: (value: string) => void;
  onActiveFilterChange: (value: string) => void;
  onHasAssignmentsChange: (value: string) => void;
  onAccountFilterChange: (value: string) => void;
  onOperationalPresetChange: (value: TeacherOperationalPreset) => void;
  onReset: () => void;
}) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (stateFilter || activeFilter || hasAssignments || accountFilter || operationalPreset !== 'all') {
      setMoreOpen(true);
    }
  }, [stateFilter, activeFilter, hasAssignments, accountFilter, operationalPreset]);

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

  const hasAdvancedActive = Boolean(
    stateFilter || activeFilter || hasAssignments || accountFilter || operationalPreset !== 'all',
  );

  return (
    <div className="teachers-list-filters" role="search">
      <div className="teachers-list-filters__primary teachers-list-filters__primary--calm">
        <div className="teachers-list-filters__field teachers-list-filters__field--search">
          <TeachersListSearchField
            value={search}
            onChange={onSearchChange}
            onClear={onSearchClear}
            placeholder={t('admin.teacherDomain.filters.searchPlaceholder')}
            label={t('admin.teacherDomain.filters.search')}
          />
        </div>

        <button
          type="button"
          className={[
            'btn btn--ghost btn--sm teachers-list-filters__more-toggle',
            hasAdvancedActive ? 'teachers-list-filters__more-toggle--active' : '',
          ].filter(Boolean).join(' ')}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          {moreOpen
            ? t('admin.studentsList.filters.hideMore')
            : t('admin.studentsList.filters.more')}
        </button>

        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
            {t('admin.teacherDomain.filters.reset')}
          </button>
        ) : null}
      </div>

      {moreOpen ? (
        <div className="teachers-list-filters__more">
          <label className="teachers-list-filters__field">
            <span className="teachers-list-filters__label">
              {t('admin.teacherDomain.presets.groupLabel')}
            </span>
            <select
              className="input teachers-list-filters__select"
              value={operationalPreset}
              onChange={(event) =>
                onOperationalPresetChange(event.target.value as TeacherOperationalPreset)
              }
            >
              {OPERATIONAL_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {t(`admin.teacherDomain.presets.${preset}`)}
                </option>
              ))}
            </select>
          </label>

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

          <label className="teachers-list-filters__field">
            <span className="teachers-list-filters__label">
              {t('admin.teacherDomain.columns.account')}
            </span>
            <select
              className="input teachers-list-filters__select"
              value={accountFilter}
              onChange={(event) => onAccountFilterChange(event.target.value)}
            >
              <option value="">{t('admin.account.filterAll')}</option>
              <option value="no_account">{t('admin.account.filterNoAccount')}</option>
            </select>
          </label>
        </div>
      ) : null}

      {hasActiveFilters ? (
        <div className="teachers-list-filters__chips" aria-live="polite">
          {operationalPreset !== 'all' ? (
            <button
              type="button"
              className="teachers-list-filters__chip teachers-list-filters__chip--action"
              onClick={() => onOperationalPresetChange('all')}
            >
              {t('admin.teacherDomain.presets.chip', {
                value: t(`admin.teacherDomain.presets.${operationalPreset}`),
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
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
          {accountFilter === 'no_account' ? (
            <button
              type="button"
              className="teachers-list-filters__chip teachers-list-filters__chip--action"
              onClick={() => onAccountFilterChange('')}
            >
              {t('admin.account.filterNoAccount')}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
