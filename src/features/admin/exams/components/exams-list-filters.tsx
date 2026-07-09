'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { EXAM_LIST_STATES } from '@/features/admin/exams/utils/exams-list-present';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';

export function ExamsListFilters({
  classId,
  stateFilter,
  classes,
  hasActiveFilters,
  onClassIdChange,
  onStateFilterChange,
  onReset,
}: {
  classId: string;
  stateFilter: string;
  classes: SchoolClass[];
  hasActiveFilters: boolean;
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
    <div className="exams-list-filters">
      <div className="exams-list-filters__primary">
        <select
          className="input exams-list-filters__class"
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
