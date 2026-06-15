'use client';

import type { FinanceHubFilterState } from '@/features/admin/finance/finance-hub-period';
import { useT } from '@/features/i18n/locale-context';
import type { AcademicYearOption } from '@/lib/utils/academic-years';

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
    </div>
  );
}
