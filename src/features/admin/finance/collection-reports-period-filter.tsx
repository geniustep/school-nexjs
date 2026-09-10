'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Calendar-month-first period control for collection reports. It only maps
 * user choices to the existing date/date_from/date_to contract; financial
 * calculations remain authoritative in Odoo.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import {
  collectionReportsMonthRange,
  collectionReportsMonthValueFromFilters,
  collectionReportsRangeIsWholeMonth,
  currentCollectionReportsMonthValue,
  shiftCollectionReportsMonth,
} from '@/features/admin/finance/utils/collection-reports-period';
import {
  collectionReportsPresetUpdates,
  collectionReportsRangeIsInverted,
  resolveCollectionReportsDatePreset,
} from '@/features/admin/finance/utils/collection-reports-ux';
import type { CollectionReportsFilters } from '@/features/admin/finance/utils/collection-reports-present';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale } from '@/features/i18n/locale-context';
import '@/features/admin/finance/collection-reports-period-filter.css';

export type CollectionReportsPeriodMode = 'month' | 'custom';

type Props = {
  filters: CollectionReportsFilters;
  onFiltersChange: (
    updates: Partial<Record<keyof CollectionReportsFilters, string | number | null>>,
    options?: { periodMode?: CollectionReportsPeriodMode },
  ) => void;
};

const COPY = {
  ar: {
    period: 'الفترة',
    monthMode: 'الشهر',
    customMode: 'فترة مخصصة',
    month: 'الشهر',
    year: 'السنة',
    currentMonth: 'هذا الشهر',
    previousMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    dateFrom: 'من',
    dateTo: 'إلى',
    apply: 'تطبيق الفترة',
    shownPeriod: 'الفترة المعروضة',
    rangeError: 'تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه.',
    customHint: 'حدد تاريخ البداية والنهاية ثم طبّق الفترة.',
  },
  en: {
    period: 'Period',
    monthMode: 'Month',
    customMode: 'Custom range',
    month: 'Month',
    year: 'Year',
    currentMonth: 'This month',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    dateFrom: 'From',
    dateTo: 'To',
    apply: 'Apply period',
    shownPeriod: 'Displayed period',
    rangeError: 'The start date must be before or equal to the end date.',
    customHint: 'Choose the start and end dates, then apply the period.',
  },
  fr: {
    period: 'Période',
    monthMode: 'Mois',
    customMode: 'Période personnalisée',
    month: 'Mois',
    year: 'Année',
    currentMonth: 'Ce mois',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    dateFrom: 'Du',
    dateTo: 'Au',
    apply: 'Appliquer la période',
    shownPeriod: 'Période affichée',
    rangeError: 'La date de début doit précéder ou être égale à la date de fin.',
    customHint: 'Choisissez les dates de début et de fin, puis appliquez la période.',
  },
  es: {
    period: 'Periodo',
    monthMode: 'Mes',
    customMode: 'Periodo personalizado',
    month: 'Mes',
    year: 'Año',
    currentMonth: 'Este mes',
    previousMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    dateFrom: 'Desde',
    dateTo: 'Hasta',
    apply: 'Aplicar periodo',
    shownPeriod: 'Periodo mostrado',
    rangeError: 'La fecha inicial debe ser anterior o igual a la fecha final.',
    customHint: 'Elige las fechas de inicio y fin y aplica el periodo.',
  },
} as const;

const INTL_LOCALE = {
  ar: 'ar-MA',
  en: 'en-GB',
  fr: 'fr-MA',
  es: 'es-ES',
} as const;

function monthName(monthIndex: number, locale: keyof typeof INTL_LOCALE): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'long' }).format(
    new Date(2026, monthIndex, 1),
  );
}

export function CollectionReportsPeriodFilter({ filters, onFiltersChange }: Props) {
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const searchParams = useSearchParams();
  const copy = COPY[locale];

  const explicitCustomMode = searchParams.get('period_ui') === 'custom';
  const periodMode: CollectionReportsPeriodMode =
    explicitCustomMode || !collectionReportsRangeIsWholeMonth(filters) ? 'custom' : 'month';
  const legacyDateChipPresent = resolveCollectionReportsDatePreset(filters) !== 'today';

  const selectedMonthValue = collectionReportsMonthValueFromFilters(filters);
  const [selectedYear, selectedMonth] = selectedMonthValue.split('-').map(Number);
  const currentMonthValue = useMemo(() => currentCollectionReportsMonthValue(), []);

  const [dateFromDraft, setDateFromDraft] = useState(
    filters.dateMode === 'range' ? filters.dateFrom : filters.date,
  );
  const [dateToDraft, setDateToDraft] = useState(
    filters.dateMode === 'range' ? filters.dateTo : filters.date,
  );

  useEffect(() => {
    if (periodMode !== 'custom') return;
    setDateFromDraft(filters.dateMode === 'range' ? filters.dateFrom : filters.date);
    setDateToDraft(filters.dateMode === 'range' ? filters.dateTo : filters.date);
  }, [filters.date, filters.dateFrom, filters.dateMode, filters.dateTo, periodMode]);

  const yearOptions = useMemo(
    () => Array.from({ length: 11 }, (_, index) => selectedYear - 5 + index),
    [selectedYear],
  );

  const rangeInvalid = collectionReportsRangeIsInverted(dateFromDraft, dateToDraft);
  const customComplete = Boolean(dateFromDraft.trim() && dateToDraft.trim());
  const customChanged =
    filters.dateMode !== 'range' ||
    filters.dateFrom !== dateFromDraft ||
    filters.dateTo !== dateToDraft;

  const shownPeriod = useMemo(() => {
    if (filters.dateMode === 'day') {
      return filters.date ? formatDate(filters.date) : '—';
    }
    if (!filters.dateFrom && !filters.dateTo) return '—';
    if (filters.dateFrom && filters.dateTo) {
      return `${formatDate(filters.dateFrom)} — ${formatDate(filters.dateTo)}`;
    }
    return formatDate(filters.dateFrom || filters.dateTo);
  }, [filters.date, filters.dateFrom, filters.dateMode, filters.dateTo, formatDate]);

  function applyMonth(monthValue: string) {
    onFiltersChange(
      {
        ...collectionReportsMonthRange(monthValue),
        page: 1,
      },
      { periodMode: 'month' },
    );
  }

  function selectMode(mode: CollectionReportsPeriodMode) {
    if (mode === 'month') {
      applyMonth(selectedMonthValue);
      return;
    }

    const fallbackDate = filters.date || filters.dateFrom || collectionReportsPresetUpdates('today').date;
    const from = filters.dateMode === 'range' ? filters.dateFrom || fallbackDate : fallbackDate;
    const to = filters.dateMode === 'range' ? filters.dateTo || from : fallbackDate;
    setDateFromDraft(from);
    setDateToDraft(to);
    onFiltersChange({}, { periodMode: 'custom' });
  }

  return (
    <section
      className="finance-collection-period"
      aria-labelledby="fcr-period-title"
      data-legacy-date-chip={legacyDateChipPresent ? 'true' : 'false'}
    >
      <div className="finance-collection-period__head">
        <strong id="fcr-period-title" className="finance-collection-period__title">
          {copy.period}
        </strong>
        <div className="finance-collection-period__modes" role="tablist" aria-label={copy.period}>
          <button
            type="button"
            role="tab"
            aria-selected={periodMode === 'month'}
            className={`finance-collection-reports__seg${periodMode === 'month' ? ' is-active' : ''}`}
            onClick={() => selectMode('month')}
          >
            {copy.monthMode}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={periodMode === 'custom'}
            className={`finance-collection-reports__seg${periodMode === 'custom' ? ' is-active' : ''}`}
            onClick={() => selectMode('custom')}
          >
            {copy.customMode}
          </button>
        </div>
      </div>

      {periodMode === 'month' ? (
        <div className="finance-collection-period__month-row">
          <button
            type="button"
            className="finance-collection-period__nav"
            aria-label={copy.previousMonth}
            onClick={() => applyMonth(shiftCollectionReportsMonth(selectedMonthValue, -1))}
          >
            ‹
          </button>

          <div className="finance-collection-period__field finance-collection-period__field--month">
            <label htmlFor="fcr-period-month">{copy.month}</label>
            <select
              id="fcr-period-month"
              className="input"
              value={String(selectedMonth)}
              onChange={(event) =>
                applyMonth(`${selectedYear}-${String(Number(event.target.value)).padStart(2, '0')}`)
              }
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {monthName(index, locale)}
                </option>
              ))}
            </select>
          </div>

          <div className="finance-collection-period__field finance-collection-period__field--year">
            <label htmlFor="fcr-period-year">{copy.year}</label>
            <select
              id="fcr-period-year"
              className="input"
              value={String(selectedYear)}
              onChange={(event) =>
                applyMonth(
                  `${event.target.value}-${String(selectedMonth).padStart(2, '0')}`,
                )
              }
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn--ghost btn--sm finance-collection-period__today"
            disabled={selectedMonthValue === currentMonthValue}
            onClick={() => applyMonth(currentMonthValue)}
          >
            {copy.currentMonth}
          </button>

          <button
            type="button"
            className="finance-collection-period__nav"
            aria-label={copy.nextMonth}
            onClick={() => applyMonth(shiftCollectionReportsMonth(selectedMonthValue, 1))}
          >
            ›
          </button>
        </div>
      ) : (
        <div className="finance-collection-period__custom">
          <p className="finance-collection-period__hint">{copy.customHint}</p>
          <div className="finance-collection-period__custom-fields">
            <div className="finance-collection-period__field">
              <label htmlFor="fcr-period-from">{copy.dateFrom}</label>
              <DatePickerInput
                id="fcr-period-from"
                value={dateFromDraft}
                onChange={setDateFromDraft}
                presets={false}
              />
            </div>
            <div className="finance-collection-period__field">
              <label htmlFor="fcr-period-to">{copy.dateTo}</label>
              <DatePickerInput
                id="fcr-period-to"
                value={dateToDraft}
                onChange={setDateToDraft}
                presets={false}
              />
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm finance-collection-period__apply"
              disabled={!customComplete || rangeInvalid || !customChanged}
              onClick={() =>
                onFiltersChange(
                  {
                    dateMode: 'range',
                    date: '',
                    dateFrom: dateFromDraft,
                    dateTo: dateToDraft,
                    page: 1,
                  },
                  { periodMode: 'custom' },
                )
              }
            >
              {copy.apply}
            </button>
          </div>
          {rangeInvalid ? (
            <p className="finance-collection-period__error" role="alert">
              {copy.rangeError}
            </p>
          ) : null}
        </div>
      )}

      <div className="finance-collection-period__shown" aria-live="polite">
        <span>{copy.shownPeriod}</span>
        <strong dir="auto">{shownPeriod}</strong>
      </div>
    </section>
  );
}
