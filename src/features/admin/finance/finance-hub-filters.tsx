'use client';

import type { FinanceHubFilterState, FinanceHubPeriodPreset } from '@/features/admin/finance/finance-hub-period';
import { useT } from '@/features/i18n/locale-context';
import type { AcademicYearOption } from '@/lib/utils/academic-years';

const PERIOD_PRESETS: FinanceHubPeriodPreset[] = [
  'this_month',
  'last_30_days',
  'this_term',
  'academic_year',
  'custom',
];

export function FinanceHubFilters({
  filters,
  onChange,
  yearOptions,
  showSchoolFilter,
  schools,
  activeSchoolId,
  onSchoolChange,
}: {
  filters: FinanceHubFilterState;
  onChange: (next: FinanceHubFilterState) => void;
  yearOptions: AcademicYearOption[];
  showSchoolFilter?: boolean;
  schools?: { id: number; name: string }[];
  activeSchoolId?: number | null;
  onSchoolChange?: (schoolId: string) => void;
}) {
  const t = useT();

  return (
    <div className="finance-hub-filters card" role="search">
      {showSchoolFilter && schools && schools.length > 1 && onSchoolChange ? (
        <label className="finance-hub-filters__field">
          <span className="tiny muted">{t('admin.finance.activeSchool')}</span>
          <select
            className="input"
            value={activeSchoolId ?? ''}
            onChange={(e) => onSchoolChange(e.target.value)}
          >
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="finance-hub-filters__field">
        <span className="tiny muted">{t('admin.finance.hub.filterAcademicYear')}</span>
        <select
          className="input"
          value={filters.yearId}
          onChange={(e) => onChange({ ...filters, yearId: e.target.value })}
        >
          <option value="">{t('admin.finance.allAcademicYears')}</option>
          {yearOptions.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="finance-hub-filters__period">
        <legend className="tiny muted">{t('admin.finance.hub.filterPeriod')}</legend>
        <div className="finance-hub-filters__period-options">
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`btn btn--sm ${filters.period === preset ? 'btn--primary' : 'btn--ghost'}`}
              aria-pressed={filters.period === preset}
              onClick={() => onChange({ ...filters, period: preset })}
            >
              {t(`admin.finance.hub.period.${preset}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {filters.period === 'custom' ? (
        <>
          <label className="finance-hub-filters__field">
            <span className="tiny muted">{t('admin.finance.dateFrom')}</span>
            <input
              className="input"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            />
          </label>
          <label className="finance-hub-filters__field">
            <span className="tiny muted">{t('admin.finance.dateTo')}</span>
            <input
              className="input"
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
