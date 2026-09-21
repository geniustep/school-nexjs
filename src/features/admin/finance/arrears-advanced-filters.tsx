'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type {
  ArrearsFilterOption,
  ArrearsFilterOptions,
  ArrearsListFilters,
} from '@/types/finance-arrears';

type Props = {
  filters: ArrearsListFilters;
  options: ArrearsFilterOptions;
  onChange: (
    updates: Partial<Record<keyof ArrearsListFilters, string | number | null>>,
  ) => void;
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  allLabel: string;
}) {
  return (
    <label className="finance-arrears-filters__field">
      <span>{label}</span>
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} dir="auto">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function toOptions(items: ArrearsFilterOption[]): Array<{ value: string; label: string }> {
  return items.map((item) => ({ value: String(item.id), label: item.name }));
}

export function ArrearsAdvancedFilters({ filters, options, onChange }: Props) {
  const t = useT();
  const classes = useMemo(
    () =>
      filters.levelId
        ? options.classes.filter(
            (item) => item.level_id == null || String(item.level_id) === filters.levelId,
          )
        : options.classes,
    [filters.levelId, options.classes],
  );

  const set = (key: keyof ArrearsListFilters, value: string) =>
    onChange({ [key]: value || null, page: 1 });

  const clearAdvanced = () =>
    onChange({
      academicYearId: null,
      levelId: null,
      classId: null,
      workflowStatus: null,
      contactResult: null,
      assignedUserId: null,
      followupDue: null,
      pendingCheque: null,
      paymentPromise: null,
      contacted: null,
      actionableMin: null,
      actionableMax: null,
      oldestAge: null,
      dueMonth: null,
      feeTypeId: null,
      page: 1,
    });

  const activeAdvanced = [
    filters.academicYearId,
    filters.levelId,
    filters.classId,
    filters.workflowStatus,
    filters.contactResult,
    filters.assignedUserId,
    filters.followupDue,
    filters.pendingCheque,
    filters.paymentPromise,
    filters.contacted,
    filters.actionableMin,
    filters.actionableMax,
    filters.oldestAge,
    filters.dueMonth,
    filters.feeTypeId,
  ].filter(Boolean).length;

  return (
    <section className="finance-arrears-filters" aria-label={t('admin.finance.arrears.filters.title')}>
      <div className="finance-arrears-filters__primary">
        <FilterSelect
          label={t('admin.finance.arrears.filters.academicYear')}
          value={filters.academicYearId}
          options={toOptions(options.academic_years)}
          onChange={(value) => set('academicYearId', value)}
          allLabel={t('admin.finance.arrears.filters.all')}
        />
        <FilterSelect
          label={t('admin.finance.arrears.filters.level')}
          value={filters.levelId}
          options={toOptions(options.levels)}
          onChange={(value) =>
            onChange({ levelId: value || null, classId: null, page: 1 })
          }
          allLabel={t('admin.finance.arrears.filters.all')}
        />
        <FilterSelect
          label={t('admin.finance.arrears.filters.class')}
          value={filters.classId}
          options={toOptions(classes)}
          onChange={(value) => set('classId', value)}
          allLabel={t('admin.finance.arrears.filters.all')}
        />
        <button
          type="button"
          className={`btn btn--ghost btn--sm${filters.contacted === 'no' ? ' is-active' : ''}`}
          onClick={() => set('contacted', filters.contacted === 'no' ? '' : 'no')}
        >
          {t('admin.finance.arrears.filters.notContacted')}
        </button>
      </div>

      <details className="finance-arrears-filters__more" open={activeAdvanced > 3}>
        <summary>
          {t('admin.finance.arrears.filters.more')}
          {activeAdvanced > 0 ? <span>{activeAdvanced}</span> : null}
        </summary>
        <div className="finance-arrears-filters__grid">
          <FilterSelect
            label={t('admin.finance.arrears.filters.workflowStatus')}
            value={filters.workflowStatus}
            options={[
              { value: 'needs_followup', label: t('admin.finance.arrears.statuses.needsFollowup') },
              { value: 'payment_promise', label: t('admin.finance.arrears.statuses.paymentPromise') },
              { value: 'escalated', label: t('admin.finance.arrears.statuses.escalated') },
              { value: 'resolved', label: t('admin.finance.arrears.statuses.resolved') },
            ]}
            onChange={(value) => set('workflowStatus', value)}
            allLabel={t('admin.finance.arrears.filters.all')}
          />
          <FilterSelect
            label={t('admin.finance.arrears.filters.contactResult')}
            value={filters.contactResult}
            options={['reached','no_answer','busy','wrong_number','callback_requested'].map((value) => ({
              value,
              label: t(`admin.finance.arrears.contactResults.${value}`),
            }))}
            onChange={(value) => set('contactResult', value)}
            allLabel={t('admin.finance.arrears.filters.all')}
          />
          <FilterSelect
            label={t('admin.finance.arrears.filters.assignedUser')}
            value={filters.assignedUserId}
            options={toOptions(options.assigned_users)}
            onChange={(value) => set('assignedUserId', value)}
            allLabel={t('admin.finance.arrears.filters.all')}
          />
          <FilterSelect
            label={t('admin.finance.arrears.filters.followupDue')}
            value={filters.followupDue}
            options={[
              { value: 'today', label: t('admin.finance.arrears.filters.today') },
              { value: 'overdue', label: t('admin.finance.arrears.filters.overdue') },
              { value: 'this_week', label: t('admin.finance.arrears.filters.thisWeek') },
              { value: 'unscheduled', label: t('admin.finance.arrears.filters.unscheduled') },
            ]}
            onChange={(value) => set('followupDue', value)}
            allLabel={t('admin.finance.arrears.filters.all')}
          />
          <FilterSelect
            label={t('admin.finance.arrears.filters.pendingCheque')}
            value={filters.pendingCheque}
            options={[
              { value: 'yes', label: t('common.yes') },
              { value: 'no', label: t('common.no') },
            ]}
            onChange={(value) => set('pendingCheque', value)}
            allLabel={t('admin.finance.arrears.filters.all')}
          />
          <FilterSelect
            label={t('admin.finance.arrears.filters.paymentPromise')}
            value={filters.paymentPromise}
            options={[
              { value: 'yes', label: t('common.yes') },
              { value: 'no', label: t('common.no') },
            ]}
            onChange={(value) => set('paymentPromise', value)}
            allLabel={t('admin.finance.arrears.filters.all')}
          />
          <FilterSelect
            label={t('admin.finance.arrears.filters.contacted')}
            value={filters.contacted}
            options={[
              { value: 'yes', label: t('admin.finance.arrears.filters.contactedYes') },
              { value: 'no', label: t('admin.finance.arrears.filters.contactedNo') },
            ]}
            onChange={(value) => set('contacted', value)}
            allLabel={t('admin.finance.arrears.filters.all')}
          />
          <FilterSelect
            label={t('admin.finance.arrears.filters.oldestAge')}
            value={filters.oldestAge}
            options={[
              { value: 'lt_30', label: t('admin.finance.arrears.filters.ageLt30') },
              { value: 'd30_59', label: t('admin.finance.arrears.filters.age30_59') },
              { value: 'd60_89', label: t('admin.finance.arrears.filters.age60_89') },
              { value: 'd90_plus', label: t('admin.finance.arrears.filters.age90Plus') },
            ]}
            onChange={(value) => set('oldestAge', value)}
            allLabel={t('admin.finance.arrears.filters.all')}
          />
          <label className="finance-arrears-filters__field">
            <span>{t('admin.finance.arrears.filters.dueMonth')}</span>
            <input className="input" type="month" value={filters.dueMonth} onChange={(event) => set('dueMonth', event.target.value)} />
          </label>
          <FilterSelect
            label={t('admin.finance.arrears.filters.service')}
            value={filters.feeTypeId}
            options={toOptions(options.fee_types)}
            onChange={(value) => set('feeTypeId', value)}
            allLabel={t('admin.finance.arrears.filters.all')}
          />
          <label className="finance-arrears-filters__field">
            <span>{t('admin.finance.arrears.filters.amountMin')}</span>
            <input className="input" inputMode="decimal" type="number" min="0" step="0.01" value={filters.actionableMin} onChange={(event) => set('actionableMin', event.target.value)} />
          </label>
          <label className="finance-arrears-filters__field">
            <span>{t('admin.finance.arrears.filters.amountMax')}</span>
            <input className="input" inputMode="decimal" type="number" min="0" step="0.01" value={filters.actionableMax} onChange={(event) => set('actionableMax', event.target.value)} />
          </label>
        </div>
        {activeAdvanced ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearAdvanced}>
            {t('admin.finance.arrears.filters.clearAll')}
          </button>
        ) : null}
      </details>
    </section>
  );
}
