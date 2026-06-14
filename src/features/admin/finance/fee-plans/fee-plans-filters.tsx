'use client';

import { useT } from '@/features/i18n/locale-context';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { Level } from '@/types/class';

export interface FeePlanFiltersState {
  search: string;
  yearId: string;
  levelId: string;
  stateFilter: string;
}

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
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(null);
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, { page_size: 200 });

  return (
    <form
      className="toolbar fee-plans-filters"
      data-testid="fee-plans-filters"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <input
        className="input fee-plans-filters__search"
        placeholder={t('admin.finance.feePlansWorkspace.searchPlaceholder')}
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
      />
      <select
        className="input fee-plans-filters__select"
        value={filters.yearId}
        onChange={(e) => {
          const next = { ...filters, yearId: e.target.value };
          onChange({ yearId: e.target.value });
          onSearchSubmit(next);
        }}
        disabled={yearsLoading}
      >
        <option value="">{t('admin.finance.allAcademicYears')}</option>
        {yearOptions.map((y) => (
          <option key={y.id} value={y.id}>
            {y.name}
          </option>
        ))}
      </select>
      <select
        className="input fee-plans-filters__select"
        value={filters.levelId}
        onChange={(e) => {
          onChange({ levelId: e.target.value });
          onSearchSubmit({ ...filters, levelId: e.target.value });
        }}
        disabled={levelsState.loading}
      >
        <option value="">{t('admin.finance.feePlansWorkspace.allLevels')}</option>
        {(levelsState.data ?? []).map((level) => (
          <option key={level.id} value={level.id}>
            {level.name}
          </option>
        ))}
      </select>
      <select
        className="input fee-plans-filters__select"
        value={filters.stateFilter}
        onChange={(e) => {
          onChange({ stateFilter: e.target.value });
          onSearchSubmit({ ...filters, stateFilter: e.target.value });
        }}
      >
        <option value="">{t('common.allStatuses')}</option>
        <option value="draft">{t('admin.finance.states.draft')}</option>
        <option value="confirmed">{t('admin.finance.states.confirmed')}</option>
        <option value="archived">{t('admin.finance.states.archived')}</option>
      </select>
      <button type="submit" className="btn btn--ghost btn--sm">
        {t('admin.search')}
      </button>
      {hasActiveFilters && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
          {t('admin.finance.feePlansWorkspace.clearFilters')}
        </button>
      )}
    </form>
  );
}
