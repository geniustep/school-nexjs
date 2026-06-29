'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { AgreementAmendmentPeriodOption } from '../types/agreement-amendment';
import { formatAmendmentEffectivePeriodLabel } from '../utils/agreement-amendment-period-labels';
import { sortAgreementAmendmentPeriodOptions } from '../utils/sort-agreement-amendment-period-options';

function findPeriodIndex(periods: AgreementAmendmentPeriodOption[], periodId: string): number {
  return periods.findIndex((period) => String(period.id) === periodId);
}

function resolveVisualEndPeriodId(
  periods: AgreementAmendmentPeriodOption[],
  startPeriodId: string,
  endPeriodId: string,
): string {
  if (endPeriodId) return endPeriodId;
  if (!startPeriodId) return '';
  const selectable = periods.filter((period) => period.selectable !== false);
  return selectable.length ? String(selectable[selectable.length - 1]!.id) : '';
}

export function AgreementAmendmentRangeRail({
  periods,
  startPeriodId,
  endPeriodId,
  loading,
  disabled,
  onStartSelect,
  onEndSelect,
}: {
  periods: AgreementAmendmentPeriodOption[];
  startPeriodId: string;
  endPeriodId: string;
  loading?: boolean;
  disabled?: boolean;
  onStartSelect: (periodId: string) => void;
  onEndSelect: (periodId: string) => void;
}) {
  const t = useT();
  const sortedPeriods = useMemo(() => sortAgreementAmendmentPeriodOptions(periods), [periods]);
  const visualEndPeriodId = resolveVisualEndPeriodId(sortedPeriods, startPeriodId, endPeriodId);

  const startIndex = findPeriodIndex(sortedPeriods, startPeriodId);
  const endIndex = findPeriodIndex(sortedPeriods, visualEndPeriodId);
  const rangeStart = startIndex >= 0 ? Math.min(startIndex, endIndex >= 0 ? endIndex : startIndex) : -1;
  const rangeEnd =
    startIndex >= 0 && endIndex >= 0 ? Math.max(startIndex, endIndex) : startIndex >= 0 ? startIndex : -1;

  function handlePeriodClick(period: AgreementAmendmentPeriodOption) {
    if (disabled || period.selectable === false) return;
    const periodId = String(period.id);
    const clickedIndex = findPeriodIndex(sortedPeriods, periodId);

    if (!startPeriodId) {
      onStartSelect(periodId);
      onEndSelect('');
      return;
    }

    if (startPeriodId === periodId && !endPeriodId) {
      onEndSelect(visualEndPeriodId || periodId);
      return;
    }

    if (clickedIndex < startIndex) {
      onStartSelect(periodId);
      onEndSelect('');
      return;
    }

    onEndSelect(periodId);
  }

  const startPeriod =
    startPeriodId != null
      ? sortedPeriods.find((period) => String(period.id) === startPeriodId) ?? null
      : null;
  const endPeriod =
    visualEndPeriodId != null
      ? sortedPeriods.find((period) => String(period.id) === visualEndPeriodId) ?? null
      : null;

  return (
    <div className="student-finance-amendment-range-rail">
      <p className="tiny muted student-finance-amendment-range-rail__hint">
        {t('admin.student360.financeWorkspace.agreementAmendment.rangeRailHint')}
      </p>
      {loading ? <span className="tiny muted">{t('common.loading')}</span> : null}
      <div
        className="student-finance-amendment-range-rail__track-wrap"
        role="group"
        aria-label={t('admin.student360.financeWorkspace.agreementAmendment.choosePeriodRange')}
      >
        <div className="student-finance-amendment-range-rail__track" aria-hidden="true" />
        <div className="student-finance-amendment-range-rail__scroll">
          {sortedPeriods.map((period, index) => {
            const selectable = period.selectable !== false;
            const periodId = String(period.id);
            const isStart = startPeriodId === periodId;
            const isEnd = visualEndPeriodId === periodId;
            const inRange = rangeStart >= 0 && index >= rangeStart && index <= rangeEnd;
            const label = formatAmendmentEffectivePeriodLabel(period, t);

            return (
              <button
                key={period.id}
                type="button"
                aria-pressed={isStart || isEnd}
                aria-disabled={!selectable}
                disabled={disabled || !selectable}
                title={!selectable && period.disabledReason ? period.disabledReason : undefined}
                className={[
                  'student-finance-amendment-range-rail__point',
                  inRange ? 'student-finance-amendment-range-rail__point--in-range' : '',
                  isStart ? 'student-finance-amendment-range-rail__point--start' : '',
                  isEnd ? 'student-finance-amendment-range-rail__point--end' : '',
                  !selectable ? 'student-finance-amendment-range-rail__point--disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handlePeriodClick(period)}
              >
                <span className="student-finance-amendment-range-rail__dot" aria-hidden="true" />
                <span className="student-finance-amendment-range-rail__label" dir="auto">
                  {label}
                </span>
                {isStart ? (
                  <span className="student-finance-amendment-range-rail__handle">
                    {t('admin.student360.financeWorkspace.agreementAmendment.fromMonth')}
                  </span>
                ) : null}
                {isEnd && !isStart ? (
                  <span className="student-finance-amendment-range-rail__handle">
                    {t('admin.student360.financeWorkspace.agreementAmendment.toMonth')}
                  </span>
                ) : null}
                {isStart && isEnd ? (
                  <span className="student-finance-amendment-range-rail__handle">
                    {t('admin.student360.financeWorkspace.agreementAmendment.toEndOfYear')}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {startPeriod ? (
        <p className="student-finance-amendment-range-rail__summary" dir="auto">
          {t('admin.student360.financeWorkspace.agreementAmendment.selectedPeriodRange')}:{' '}
          {formatAmendmentEffectivePeriodLabel(startPeriod, t)}
          {endPeriod && endPeriod.id !== startPeriod.id
            ? ` → ${formatAmendmentEffectivePeriodLabel(endPeriod, t)}`
            : endPeriod
              ? ` → ${t('admin.student360.financeWorkspace.agreementAmendment.toEndOfYear')}`
              : ''}
        </p>
      ) : null}
      <p className="tiny muted student-finance-amendment-range-rail__backend-note">
        {t('admin.student360.financeWorkspace.agreementAmendment.rangeRailBackendNote')}
      </p>
    </div>
  );
}
