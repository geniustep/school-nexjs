'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { RESOURCE_LIST_STATES } from '@/features/admin/resources/utils/resources-list-present';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';

export function ResourcesListFilters({
  classId,
  stateFilter,
  typeFilter,
  classes,
  hasActiveFilters,
  onClassIdChange,
  onStateFilterChange,
  onTypeFilterChange,
  onTypeFilterClear,
  onReset,
}: {
  classId: string;
  stateFilter: string;
  typeFilter: string;
  classes: SchoolClass[];
  hasActiveFilters: boolean;
  onClassIdChange: (value: string) => void;
  onStateFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onTypeFilterClear: () => void;
  onReset: () => void;
}) {
  const t = useT();

  const selectedClassLabel = classId
    ? (classes.find((item) => String(item.id) === classId)?.name ?? null)
    : null;

  const selectedStateLabel = stateFilter ? t(`states.${stateFilter}`) : null;
  const trimmedType = typeFilter.trim();

  return (
    <div className="resources-list-filters">
      <div className="resources-list-filters__primary">
        <select
          className="input resources-list-filters__class"
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
          className="input resources-list-filters__state"
          value={stateFilter}
          onChange={(event) => onStateFilterChange(event.target.value)}
          aria-label={t('academic.status')}
        >
          <option value="">{t('admin.allStates')}</option>
          {RESOURCE_LIST_STATES.map((state) => (
            <option key={state} value={state}>
              {t(`states.${state}`)}
            </option>
          ))}
        </select>

        <label className="resources-list-type-field">
          <span className="resources-list-type-field__sr-only">{t('academic.type')}</span>
          <input
            type="search"
            className="input resources-list-type-field__input"
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value)}
            placeholder={t('admin.resourcesList.typePlaceholder')}
            aria-label={t('academic.type')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            dir="auto"
          />
          {typeFilter ? (
            <button
              type="button"
              className="resources-list-type-field__clear"
              onClick={onTypeFilterClear}
              aria-label={t('admin.resourcesList.clearType')}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </label>

        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
            {t('admin.resourcesList.resetFilters')}
          </button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="resources-list-filters__chips" aria-live="polite">
          {selectedClassLabel ? (
            <button
              type="button"
              className="resources-list-filters__chip resources-list-filters__chip--action"
              onClick={() => onClassIdChange('')}
            >
              {t('admin.resourcesList.filters.chipClass', { className: selectedClassLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedStateLabel ? (
            <button
              type="button"
              className="resources-list-filters__chip resources-list-filters__chip--action"
              onClick={() => onStateFilterChange('')}
            >
              {t('admin.resourcesList.filters.chipStatus', { status: selectedStateLabel })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {trimmedType ? (
            <button
              type="button"
              className="resources-list-filters__chip resources-list-filters__chip--action"
              onClick={onTypeFilterClear}
            >
              {t('admin.resourcesList.filters.chipType', { type: trimmedType })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
