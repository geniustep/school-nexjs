'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import {
  buildEnabledFeePlanScopeLevels,
  buildFeePlanScopeGroups,
} from './fee-plan-level-scope';

export interface FeePlanFiltersState {
  search: string;
  yearId: string;
  cycleId: string;
  levelId: string;
  stateFilter: string;
}

const STATUS_OPTIONS = [
  { value: '', labelKey: 'common.allStatuses' as const },
  { value: 'draft', labelKey: 'admin.finance.states.draft' as const },
  { value: 'confirmed', labelKey: 'admin.finance.states.confirmed' as const },
  { value: 'archived', labelKey: 'admin.finance.states.archived' as const },
];

export function FeePlansFilters({
  filters,
  onChange,
  onSearch,
  onSearchSubmit,
  onClear,
  hasActiveFilters,
}: {
  filters: FeePlanFiltersState;
  onChange: (patch: Partial<FeePlanFiltersState>) => void;
  onSearch: () => void;
  onSearchSubmit: (next: FeePlanFiltersState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}) {
  const t = useT();
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const scopeGroups = useMemo(
    () => buildFeePlanScopeGroups(levelOptionsState.options),
    [levelOptionsState.options],
  );
  const enabledLevels = buildEnabledFeePlanScopeLevels(levelOptionsState.options);
  const cycles = useMemo(
    () => scopeGroups.map((group) => group.cycle).sort((a, b) => a.sequence - b.sequence),
    [scopeGroups],
  );
  const visibleLevels = useMemo(() => {
    if (!filters.cycleId) return enabledLevels;
    const group = scopeGroups.find((g) => String(g.cycle.id) === filters.cycleId);
    if (!group) return enabledLevels;
    const ids = new Set(group.levels.map((level) => level.schoolLevelId));
    return enabledLevels.filter((level) => ids.has(level.schoolLevelId));
  }, [enabledLevels, filters.cycleId, scopeGroups]);

  function applyStatus(stateFilter: string) {
    const next = { ...filters, stateFilter };
    onChange({ stateFilter });
    onSearchSubmit(next);
  }

  function applyCycle(cycleId: string) {
    let levelId = filters.levelId;
    if (cycleId && levelId) {
      const group = scopeGroups.find((g) => String(g.cycle.id) === cycleId);
      const allowed = new Set(group?.levels.map((level) => level.schoolLevelId) ?? []);
      if (!allowed.has(Number(levelId))) {
        levelId = '';
      }
    }
    const next = { ...filters, cycleId, levelId };
    onChange({ cycleId, levelId });
    onSearchSubmit(next);
  }

  return (
    <section className="card fee-plans-workspace__toolbar" data-testid="fee-plans-filters">
      <form
        className="fee-plans-filters"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <div className="fee-plans-workspace__toolbar-row fee-plans-workspace__toolbar-row--primary">
          <label className="fee-plans-workspace__search">
            <span className="fee-plans-workspace__search-icon" aria-hidden>
              🔍
            </span>
            <input
              className="input fee-plans-workspace__search-input fee-plans-filters__search"
              type="search"
              placeholder={t('admin.finance.feePlansWorkspace.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              aria-label={t('admin.search')}
              dir="auto"
            />
            {filters.search ? (
              <button
                type="button"
                className="fee-plans-workspace__search-clear"
                onClick={() => {
                  const next = { ...filters, search: '' };
                  onChange({ search: '' });
                  onSearchSubmit(next);
                }}
                aria-label={t('common.clear')}
              >
                ×
              </button>
            ) : null}
          </label>

          <div className="fee-plans-workspace__field-grid">
            <label className="fee-plans-workspace__field">
              <span className="fee-plans-workspace__field-label">{t('nav.levels')}</span>
              <select
                className="input fee-plans-filters__select"
                value={filters.levelId}
                onChange={(e) => {
                  onChange({ levelId: e.target.value });
                  onSearchSubmit({ ...filters, levelId: e.target.value });
                }}
                disabled={levelOptionsState.loading}
              >
                <option value="">{t('admin.finance.feePlansWorkspace.allLevels')}</option>
                {visibleLevels.map((level) => (
                  <option key={level.schoolLevelId} value={level.schoolLevelId}>
                    {level.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="fee-plans-workspace__toolbar-actions">
            <button type="submit" className="btn btn--primary btn--sm">
              {t('admin.search')}
            </button>
            {hasActiveFilters ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
                {t('admin.finance.feePlansWorkspace.clearFilters')}
              </button>
            ) : null}
          </div>
        </div>

        {cycles.length > 0 ? (
          <div className="fee-plans-workspace__toolbar-row fee-plans-workspace__toolbar-row--cycle">
            <span className="fee-plans-workspace__filter-label">
              {t('admin.academicSetup.guided.cycleFilter')}
            </span>
            <div
              className="fee-plans-workspace__pill-scroll"
              role="group"
              aria-label={t('admin.academicSetup.guided.cycleFilter')}
            >
              <button
                type="button"
                className={`btn btn--ghost btn--sm fee-plans-workspace__cycle-pill${
                  !filters.cycleId ? ' is-active' : ''
                }`}
                aria-pressed={!filters.cycleId}
                onClick={() => applyCycle('')}
              >
                {t('admin.academicSetup.guided.allCycles')}
              </button>
              {cycles.map((cycle) => (
                <button
                  key={cycle.id}
                  type="button"
                  className={`btn btn--ghost btn--sm fee-plans-workspace__cycle-pill${
                    filters.cycleId === String(cycle.id) ? ' is-active' : ''
                  }`}
                  aria-pressed={filters.cycleId === String(cycle.id)}
                  onClick={() => applyCycle(String(cycle.id))}
                >
                  {cycle.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="fee-plans-workspace__toolbar-row fee-plans-workspace__toolbar-row--status">
          <span className="fee-plans-workspace__filter-label">{t('academic.status')}</span>
          <div
            className="fee-plans-workspace__pill-scroll"
            role="group"
            aria-label={t('academic.status')}
          >
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                className={`btn btn--ghost btn--sm fee-plans-workspace__status-pill${
                  filters.stateFilter === option.value ? ' is-active' : ''
                }`}
                aria-pressed={filters.stateFilter === option.value}
                onClick={() => applyStatus(option.value)}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </form>
    </section>
  );
}
