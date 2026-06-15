'use client';

import type { FinanceHubFilterState, FinanceHubPeriodPreset } from '@/features/admin/finance/finance-hub-period';
import { useT } from '@/features/i18n/locale-context';

const PERIOD_PRESETS: FinanceHubPeriodPreset[] = [
  'this_month',
  'last_30_days',
  'this_term',
  'academic_year',
  'custom',
];

export function FinanceHubPeriodFilters({
  filters,
  onChange,
}: {
  filters: FinanceHubFilterState;
  onChange: (next: FinanceHubFilterState) => void;
}) {
  const t = useT();

  return (
    <div className="finance-hub-period-filters" role="search">
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
