'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useMemo, useState } from 'react';
import { studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';
import {
  buildCycleOptions,
  filterLevelsForStudentsList,
  filterSchoolClassesByLevel,
  isLevelInCycle,
  isSchoolClassInLevel,
  resolveCycleLabel,
  sortCyclesForFilter,
  sortSchoolClassesForFilter,
} from '../utils/students-list-filter-options';
import type { StudentsListServicePresence } from '../utils/students-list-url';
import { StudentsListSearchField } from './students-list-search-field';
import { useT } from '@/features/i18n/locale-context';
import type { Level, SchoolClass } from '@/types/class';
import type { FeeType } from '@/types/finance';

export type StudentsListFiltersState = {
  search: string;
  cycleCode: string;
  levelId: string;
  classId: string;
  statusFilter: string;
  accountFilter: string;
  serviceId: string;
  servicePresence: StudentsListServicePresence | '';
};

export function StudentsListFilters({
  search,
  cycleCode,
  levelId,
  classId,
  statusFilter,
  accountFilter,
  serviceId,
  servicePresence,
  levels,
  classes,
  feeTypes,
  feeTypesLoading,
  hasActiveFilters,
  onSearchChange,
  onSearchClear,
  onCycleCodeChange,
  onLevelIdChange,
  onClassIdChange,
  onStatusFilterChange,
  onAccountFilterChange,
  onServiceIdChange,
  onServicePresenceChange,
  onReset,
}: StudentsListFiltersState & {
  levels: Level[];
  classes: SchoolClass[];
  feeTypes: FeeType[];
  feeTypesLoading?: boolean;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onCycleCodeChange: (value: string) => void;
  onLevelIdChange: (value: string) => void;
  onClassIdChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onAccountFilterChange: (value: string) => void;
  onServiceIdChange: (value: string) => void;
  onServicePresenceChange: (value: StudentsListServicePresence) => void;
  onReset: () => void;
}) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);

  const cycleOptions = useMemo(
    () => sortCyclesForFilter(buildCycleOptions(levels)),
    [levels],
  );
  const levelsForCycle = useMemo(
    () => filterLevelsForStudentsList(levels, cycleCode),
    [levels, cycleCode],
  );
  const classesForLevel = useMemo(
    () => sortSchoolClassesForFilter(filterSchoolClassesByLevel(classes, levelId)),
    [classes, levelId],
  );

  const sortedFeeTypes = useMemo(
    () =>
      [...feeTypes].sort((a, b) => {
        const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
        const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
        if (seqA !== seqB) return seqA - seqB;
        return (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
      }),
    [feeTypes],
  );

  useEffect(() => {
    if (!cycleCode && levelId) onLevelIdChange('');
  }, [cycleCode, levelId, onLevelIdChange]);

  useEffect(() => {
    if (!levelId && classId) onClassIdChange('');
  }, [levelId, classId, onClassIdChange]);

  useEffect(() => {
    if (cycleCode && levelId && !isLevelInCycle(levelId, levels, cycleCode)) {
      onLevelIdChange('');
    }
  }, [cycleCode, levelId, levels, onLevelIdChange]);

  useEffect(() => {
    if (levelId && classId && !isSchoolClassInLevel(classId, classes, levelId)) {
      onClassIdChange('');
    }
  }, [levelId, classId, classes, onClassIdChange]);

  useEffect(() => {
    if (statusFilter || accountFilter || serviceId) setMoreOpen(true);
  }, [statusFilter, accountFilter, serviceId]);

  const selectedCycleLabel = useMemo(
    () => resolveCycleLabel(cycleOptions, cycleCode),
    [cycleOptions, cycleCode],
  );

  const selectedLevelLabel = useMemo(() => {
    if (!levelId) return null;
    const level = levelsForCycle.find((item) => String(item.id) === levelId);
    return level ? studentLevelLabel(level) : null;
  }, [levelId, levelsForCycle]);

  const selectedClassLabel = useMemo(() => {
    if (!classId) return null;
    const cls = classesForLevel.find((item) => String(item.id) === classId);
    return cls ? studentClassLabel(cls) : null;
  }, [classId, classesForLevel]);

  const selectedServiceLabel = useMemo(() => {
    if (!serviceId) return null;
    const feeType = sortedFeeTypes.find((item) => String(item.id) === serviceId);
    return feeType?.name?.trim() || null;
  }, [serviceId, sortedFeeTypes]);

  function handleCycleChange(nextCycleCode: string) {
    onCycleCodeChange(nextCycleCode);
    if (levelId && !isLevelInCycle(levelId, levels, nextCycleCode)) {
      onLevelIdChange('');
      onClassIdChange('');
    }
  }

  function handleLevelChange(nextLevelId: string) {
    onLevelIdChange(nextLevelId);
    if (classId && !isSchoolClassInLevel(classId, classes, nextLevelId)) {
      onClassIdChange('');
    }
  }

  const effectivePresence: StudentsListServicePresence =
    servicePresence === 'not_has' ? 'not_has' : 'has';
  const hasMoreActive = !!(statusFilter || accountFilter || serviceId);
  const hasStructuredActive = !!(
    cycleCode || levelId || classId || statusFilter || accountFilter || serviceId
  );

  return (
    <div className="students-list-filters">
      <div className="students-list-filters__primary">
        <StudentsListSearchField
          value={search}
          onChange={onSearchChange}
          onClear={onSearchClear}
          placeholder={t('admin.searchStudents')}
          label={t('admin.searchStudents')}
        />

        <select
          className="input students-list-filters__cycle"
          value={cycleCode}
          onChange={(event) => handleCycleChange(event.target.value)}
          aria-label={t('admin.studentsList.filters.cycle')}
        >
          <option value="">{t('admin.studentsList.filters.allCycles')}</option>
          {cycleOptions.map((cycle) => (
            <option key={cycle.id} value={cycle.code}>
              {cycle.name}
            </option>
          ))}
        </select>

        {cycleCode ? (
          <select
            className="input students-list-filters__level"
            value={levelId}
            onChange={(event) => handleLevelChange(event.target.value)}
            aria-label={t('admin.studentsList.filters.level')}
          >
            <option value="">{t('admin.allLevels')}</option>
            {levelsForCycle.map((level) => (
              <option key={level.id} value={level.id}>
                {studentLevelLabel(level)}
              </option>
            ))}
          </select>
        ) : null}

        {levelId ? (
          <select
            className="input students-list-filters__class"
            value={classId}
            onChange={(event) => onClassIdChange(event.target.value)}
            aria-label={t('admin.studentsList.filters.class')}
          >
            <option value="">{t('admin.allClasses')}</option>
            {classesForLevel.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {studentClassLabel(cls)}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          className={[
            'btn btn--ghost btn--sm students-list-filters__more-toggle',
            hasMoreActive ? 'students-list-filters__more-toggle--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          {moreOpen ? t('admin.studentsList.filters.hideMore') : t('admin.studentsList.filters.more')}
        </button>

        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm students-list-filters__reset" onClick={onReset}>
            {t('admin.studentsList.resetFilters')}
          </button>
        ) : null}
      </div>

      {moreOpen ? (
        <div className="students-list-filters__more students-list-filters__more--compact">
          <label className="students-list-filters__more-field">
            <span className="students-list-filters__more-label">{t('admin.studentsList.filters.status')}</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              aria-label={t('admin.studentsList.filters.status')}
            >
              <option value="">{t('admin.allStates')}</option>
              <option value="active">{t('states.active')}</option>
              <option value="suspended">{t('states.suspended')}</option>
            </select>
          </label>

          <label className="students-list-filters__more-field">
            <span className="students-list-filters__more-label">{t('admin.studentsList.filters.service')}</span>
            <select
              className="input"
              value={serviceId}
              onChange={(event) => onServiceIdChange(event.target.value)}
              aria-label={t('admin.studentsList.filters.service')}
              disabled={feeTypesLoading && sortedFeeTypes.length === 0}
            >
              <option value="">{t('admin.studentsList.filters.allServices')}</option>
              {sortedFeeTypes.map((feeType) => (
                <option key={feeType.id} value={feeType.id}>
                  {feeType.name}
                </option>
              ))}
            </select>
          </label>

          {serviceId ? (
            <label className="students-list-filters__more-field">
              <span className="students-list-filters__more-label">
                {t('admin.studentsList.filters.servicePresence')}
              </span>
              <select
                className="input"
                value={effectivePresence}
                onChange={(event) =>
                  onServicePresenceChange(event.target.value === 'not_has' ? 'not_has' : 'has')
                }
                aria-label={t('admin.studentsList.filters.servicePresence')}
              >
                <option value="has">{t('admin.studentsList.filters.serviceHas')}</option>
                <option value="not_has">{t('admin.studentsList.filters.serviceNotHas')}</option>
              </select>
            </label>
          ) : null}

          <label className="students-list-filters__more-field">
            <span className="students-list-filters__more-label">{t('admin.studentsList.filters.account')}</span>
            <select
              className="input"
              value={accountFilter}
              onChange={(event) => onAccountFilterChange(event.target.value)}
              aria-label={t('admin.studentsList.filters.account')}
            >
              <option value="">{t('admin.account.filterAll')}</option>
              <option value="has_account">{t('admin.account.filterHasAccount')}</option>
              <option value="no_account">{t('admin.account.filterNoAccount')}</option>
              <option value="inactive_account">{t('admin.account.filterInactiveAccount')}</option>
            </select>
          </label>
        </div>
      ) : null}

      {hasStructuredActive ? (
        <div className="students-list-filters__chips" aria-live="polite">
          {selectedCycleLabel ? (
            <button type="button" className="students-list-filters__chip students-list-filters__chip--action" onClick={() => handleCycleChange('')}>
              {t('admin.studentsList.filters.chipCycle', { cycle: selectedCycleLabel })}<span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedLevelLabel ? (
            <button type="button" className="students-list-filters__chip students-list-filters__chip--action" onClick={() => handleLevelChange('')}>
              {t('admin.studentsList.filters.chipLevel', { level: selectedLevelLabel })}<span aria-hidden="true">×</span>
            </button>
          ) : null}
          {selectedClassLabel ? (
            <button type="button" className="students-list-filters__chip students-list-filters__chip--action" onClick={() => onClassIdChange('')}>
              {t('admin.studentsList.filters.chipClass', { className: selectedClassLabel })}<span aria-hidden="true">×</span>
            </button>
          ) : null}
          {statusFilter ? (
            <button type="button" className="students-list-filters__chip students-list-filters__chip--action" onClick={() => onStatusFilterChange('')}>
              {t('admin.studentsList.filters.chipStatus', { status: statusLabel(t, statusFilter) })}<span aria-hidden="true">×</span>
            </button>
          ) : null}
          {serviceId ? (
            <button type="button" className="students-list-filters__chip students-list-filters__chip--action" onClick={() => onServiceIdChange('')}>
              {t('admin.studentsList.filters.chipService', { service: selectedServiceLabel ?? serviceId })}<span aria-hidden="true">×</span>
            </button>
          ) : null}
          {serviceId ? (
            <button type="button" className="students-list-filters__chip students-list-filters__chip--action" onClick={() => onServiceIdChange('')}>
              {t('admin.studentsList.filters.chipServicePresence', { presence: servicePresenceLabel(t, effectivePresence) })}<span aria-hidden="true">×</span>
            </button>
          ) : null}
          {accountFilter ? (
            <button type="button" className="students-list-filters__chip students-list-filters__chip--action" onClick={() => onAccountFilterChange('')}>
              {accountFilterLabel(t, accountFilter)}<span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function statusLabel(t: ReturnType<typeof useT>, status: string): string {
  if (status === 'active') return t('states.active');
  if (status === 'suspended') return t('states.suspended');
  return status;
}

function servicePresenceLabel(
  t: ReturnType<typeof useT>,
  presence: StudentsListServicePresence,
): string {
  return presence === 'not_has'
    ? t('admin.studentsList.filters.serviceNotHas')
    : t('admin.studentsList.filters.serviceHas');
}

function accountFilterLabel(t: ReturnType<typeof useT>, accountFilter: string): string {
  switch (accountFilter) {
    case 'has_account':
      return t('admin.account.filterHasAccount');
    case 'no_account':
      return t('admin.account.filterNoAccount');
    case 'inactive_account':
      return t('admin.account.filterInactiveAccount');
    default:
      return t('admin.account.filterAll');
  }
}
