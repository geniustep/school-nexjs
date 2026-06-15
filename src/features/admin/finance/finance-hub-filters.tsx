'use client';

import { useT } from '@/features/i18n/locale-context';

export function FinanceHubFilters({
  showSchoolFilter,
  schools,
  activeSchoolId,
  onSchoolChange,
}: {
  showSchoolFilter?: boolean;
  schools?: { id: number; name: string }[];
  activeSchoolId?: number | null;
  onSchoolChange?: (schoolId: string) => void;
}) {
  const t = useT();

  if (!showSchoolFilter || !schools || schools.length <= 1 || !onSchoolChange) {
    return null;
  }

  return (
    <div className="finance-hub-filters finance-hub-filters--school card" role="search">
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
    </div>
  );
}
