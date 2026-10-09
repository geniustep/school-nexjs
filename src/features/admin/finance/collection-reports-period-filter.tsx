'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Smart daily/monthly period control for collection reports. It only maps
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
  shiftCollectionReportsDay,
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

export type CollectionReportsPeriodMode = 'day' | 'preset' | 'month' | 'custom';

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
    today: 'اليوم',
    yesterday: 'أمس',
    week: 'هذا الأسبوع',
    last7: 'آخر 7 أيام',
    currentMonth: 'هذا الشهر',
    customMode: 'فترة مخصصة',
    previousDay: 'اليوم السابق',
    nextDay: 'اليوم التالي',
    backToday: 'العودة إلى اليوم',
    previousMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    month: 'الشهر',
    year: 'السنة',
    dateFrom: 'من',
    dateTo: 'إلى',
    apply: 'تطبيق الفترة',
    shownPeriod: 'الفترة المعروضة',
    rangeError: 'تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه.',
    customHint: 'حدد تاريخ البداية والنهاية ثم طبّق الفترة.',
  },
  en: {
    period: 'Period',
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'This week',
    last7: 'Last 7 days',
    currentMonth: 'This month',
    customMode: 'Custom range',
    previousDay: 'Previous day',
    nextDay: 'Next day',
    backToday: 'Back to today',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    month: 'Month',
    year: 'Year',
    dateFrom: 'From',
    dateTo: 'To',
    apply: 'Apply period',
    shownPeriod: 'Displayed period',
    rangeError: 'The start date must be before or equal to the end date.',
    customHint: 'Choose the start and end dates, then apply the period.',
  },
  fr: {
    period: 'Période',
    today: "Aujourd’hui",
    yesterday: 'Hier',
    week: 'Cette semaine',
    last7: '7 derniers jours',
    currentMonth: 'Ce mois',
    customMode: 'Période personnalisée',
    previousDay: 'Jour précédent',
    nextDay: 'Jour suivant',
    backToday: "Revenir à aujourd’hui",
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    month: 'Mois',
    year: 'Année',
    dateFrom: 'Du',
    dateTo: 'Au',
    apply: 'Appliquer la période',
    shownPeriod: 'Période affichée',
    rangeError: 'La date de début doit précéder ou être égale à la date de fin.',
    customHint: 'Choisissez les dates de début et de fin, puis appliquez la période.',
  },
  es: {
    period: 'Periodo',
    today: 'Hoy',
    yesterday: 'Ayer',
    week: 'Esta semana',
    last7: 'Últimos 7 días',
    currentMonth: 'Este mes',
    customMode: 'Periodo personalizado',
    previousDay: 'Día anterior',
    nextDay: 'Día siguiente',
    backToday: 'Volver a hoy',
    previousMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    month: 'Mes',
    year: 'Año',
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

  const today = useMemo(() => collectionReportsPresetUpdates('today').date, []);
  const currentMonthValue = useMemo(() => currentCollectionReportsMonthValue(), []);
  const activePreset = resolveCollectionReportsDatePreset(filters);
  const explicitCustomMode = searchParams.get('period_ui') === 'custom';
  const wholeMonth = collectionReportsRangeIsWholeMonth(filters);

  const periodMode: CollectionReportsPeriodMode = explicitCustomMode
    ? 'custom'
    : filters.dateMode === 'day'
      ? 'day'
      : wholeMonth
        ? 'month'
        : activePreset === 'week' || activePreset === 'last7'
          ? 'preset'
          : 'custom';

  const selectedMonthValue = collectionReportsMonthValueFromFilters(filters);
  const [selectedYear, selectedMonth] = selectedMonthValue.split('-').map(Number);

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

  const yearOptions = useMemo(() => {
    const currentYear = Number(currentMonthValue.slice(0, 4));
    const start = Math.min(selectedYear, currentYear) - 5;
    return Array.from({ length: currentYear - start + 1 }, (_, index) => start + index);
  }, [currentMonthValue, selectedYear]);

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

  function applyDay(day: string) {
    const safeDay = day > today ? today : day;
    onFiltersChange(
      { dateMode: 'day', date: safeDay, dateFrom: '', dateTo: '', page: 1 },
      { periodMode: 'day' },
    );
  }

  function applyPreset(preset: 'today' | 'yesterday' | 'week' | 'last7') {
    const update = collectionReportsPresetUpdates(preset);
    onFiltersChange({ ...update, page: 1 }, { periodMode: preset === 'today' || preset === 'yesterday' ? 'day' : 'preset' });
  }

  function applyMonth(monthValue: string) {
    const safeMonth = monthValue > currentMonthValue ? currentMonthValue : monthValue;
    onFiltersChange(
      { ...collectionReportsMonthRange(safeMonth), page: 1 },
      { periodMode: 'month' },
    );
  }

  function openCustomMode() {
    const fallbackDate = filters.date || filters.dateFrom || today;
    const from = filters.dateMode === 'range' ? filters.dateFrom || fallbackDate : fallbackDate;
    const to = filters.dateMode === 'range' ? filters.dateTo || from : fallbackDate;
    setDateFromDraft(from);
    setDateToDraft(to);
    onFiltersChange({}, { periodMode: 'custom' });
  }

  const quickItems = [
    { key: 'today', label: copy.today, active: activePreset === 'today', run: () => applyPreset('today') },
    { key: 'yesterday', label: copy.yesterday, active: activePreset === 'yesterday', run: () => applyPreset('yesterday') },
    { key: 'week', label: copy.week, active: activePreset === 'week', run: () => applyPreset('week') },
    { key: 'last7', label: copy.last7, active: activePreset === 'last7', run: () => applyPreset('last7') },
    {
      key: 'month',
      label: copy.currentMonth,
      active: wholeMonth && selectedMonthValue === currentMonthValue,
      run: () => applyMonth(currentMonthValue),
    },
    { key: 'custom', label: copy.customMode, active: periodMode === 'custom', run: openCustomMode },
  ] as const;

  return (
    <section className="finance-collection-period" aria-labelledby="fcr-period-title">
      <div className="finance-collection-period__head">
        <strong id="fcr-period-title" className="finance-collection-period__title">
          {copy.period}
        </strong>
        <div className="finance-collection-period__quick" aria-label={copy.period}>
          {quickItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`finance-collection-reports__seg${item.active ? ' is-active' : ''}`}
              aria-pressed={item.active}
              onClick={item.run}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {periodMode === 'day' ? (
        <div className="finance-collection-period__day-row">
          <button
            type="button"
            className="finance-collection-period__nav"
            aria-label={copy.previousDay}
            onClick={() => applyDay(shiftCollectionReportsDay(filters.date || today, -1))}
          >
            ‹
          </button>
          <strong className="finance-collection-period__day-label" dir="auto">
            {formatDate(filters.date || today)}
          </strong>
          {filters.date !== today ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm finance-collection-period__today"
              onClick={() => applyPreset('today')}
            >
              {copy.backToday}
            </button>
          ) : null}
          <button
            type="button"
            className="finance-collection-period__nav"
            aria-label={copy.nextDay}
            disabled={(filters.date || today) >= today}
            onClick={() => applyDay(shiftCollectionReportsDay(filters.date || today, 1))}
          >
            ›
          </button>
        </div>
      ) : null}

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
              {Array.from({ length: 12 }, (_, index) => {
                const value = index + 1;
                const candidate = `${selectedYear}-${String(value).padStart(2, '0')}`;
                return (
                  <option key={value} value={value} disabled={candidate > currentMonthValue}>
                    {monthName(index, locale)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="finance-collection-period__field finance-collection-period__field--year">
            <label htmlFor="fcr-period-year">{copy.year}</label>
            <select
              id="fcr-period-year"
              className="input"
              value={String(selectedYear)}
              onChange={(event) =>
                applyMonth(`${event.target.value}-${String(selectedMonth).padStart(2, '0')}`)
              }
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {selectedMonthValue !== currentMonthValue ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm finance-collection-period__today"
              onClick={() => applyMonth(currentMonthValue)}
            >
              {copy.currentMonth}
            </button>
          ) : null}

          <button
            type="button"
            className="finance-collection-period__nav"
            aria-label={copy.nextMonth}
            disabled={selectedMonthValue >= currentMonthValue}
            onClick={() => applyMonth(shiftCollectionReportsMonth(selectedMonthValue, 1))}
          >
            ›
          </button>
        </div>
      ) : null}

      {periodMode === 'custom' ? (
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
      ) : null}

      <div className="finance-collection-period__shown" aria-live="polite">
        <span>{copy.shownPeriod}</span>
        <strong dir="auto">{shownPeriod}</strong>
      </div>
    </section>
  );
}
