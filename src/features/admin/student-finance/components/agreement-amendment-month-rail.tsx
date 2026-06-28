'use client';

import { useT } from '@/features/i18n/locale-context';
import type { AgreementAmendmentPeriodOption } from '../types/agreement-amendment';
import { formatAmendmentEffectivePeriodLabel } from '../utils/agreement-amendment-period-labels';

export function AgreementAmendmentMonthRail({
  periods,
  selectedPeriodId,
  loading,
  disabled,
  onSelect,
}: {
  periods: AgreementAmendmentPeriodOption[];
  selectedPeriodId: string;
  loading?: boolean;
  disabled?: boolean;
  onSelect: (periodId: string) => void;
}) {
  const t = useT();

  return (
    <div className="student-finance-amendment-month-rail">
      <p className="tiny muted student-finance-amendment-month-rail__hint">
        {t('admin.student360.financeWorkspace.agreementAmendment.effectivePeriodHint')}
      </p>
      {loading ? <span className="tiny muted">{t('common.loading')}</span> : null}
      <div className="student-finance-amendment-month-rail__scroll" role="listbox" aria-label={t('admin.student360.financeWorkspace.agreementAmendment.monthSelection')}>
        {periods.map((period) => {
          const selectable = period.selectable !== false;
          const isSelected = selectedPeriodId === String(period.id);
          const label = formatAmendmentEffectivePeriodLabel(period, t);

          return (
            <button
              key={period.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-disabled={!selectable}
              disabled={disabled || !selectable}
              title={!selectable && period.disabledReason ? period.disabledReason : undefined}
              className={`student-finance-amendment-month-rail__chip${isSelected ? ' student-finance-amendment-month-rail__chip--selected' : ''}${!selectable ? ' student-finance-amendment-month-rail__chip--disabled' : ''}`}
              onClick={() => {
                if (!selectable || disabled) return;
                onSelect(String(period.id));
              }}
            >
              <span dir="auto">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
