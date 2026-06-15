'use client';

import {
  findSelectedYear,
  resolveSummaryScopeMode,
} from '@/features/admin/finance/finance-hub-scope-utils';
import { useT } from '@/features/i18n/locale-context';
import type { AcademicYearOption } from '@/lib/utils/academic-years';

export function FinanceHubSummaryScope({
  yearId,
  onYearChange,
  yearOptions,
  loading,
}: {
  yearId: string;
  onYearChange: (yearId: string) => void;
  yearOptions: AcademicYearOption[];
  loading?: boolean;
}) {
  const t = useT();
  const mode = resolveSummaryScopeMode(yearId, yearOptions, loading);
  const selectedYear = findSelectedYear(yearId, yearOptions);
  const yearName = selectedYear?.name?.trim() ?? '';

  const title =
    mode === 'year' && yearName
      ? t('admin.finance.hub.summaryTitleYear', { year: yearName })
      : mode === 'all'
        ? t('admin.finance.hub.summaryTitleAll')
        : t('admin.finance.hub.summaryTitleNeutral');

  const description =
    mode === 'year' && yearName
      ? t('admin.finance.hub.summaryDescYear', { year: yearName })
      : mode === 'all'
        ? t('admin.finance.hub.summaryDescAll')
        : t('admin.finance.hub.summaryDescNeutral');

  const showYearSelect = yearOptions.length > 0;

  return (
    <div className="finance-hub-summary-scope card" aria-busy={loading || undefined}>
      <div className="finance-hub-summary-scope__copy">
        <h2 className="finance-hub-summary-scope__title">{title}</h2>
        <p className="finance-hub-summary-scope__desc muted">{description}</p>
      </div>

      {showYearSelect ? (
        <label className="finance-hub-summary-scope__field">
          <span className="tiny muted">{t('admin.finance.hub.filterAcademicYear')}</span>
          <select
            className="input finance-hub-summary-scope__select"
            value={yearId}
            disabled={loading}
            onChange={(event) => onYearChange(event.target.value)}
          >
            <option value="">{t('admin.finance.hub.allAcademicYears')}</option>
            {yearOptions.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
