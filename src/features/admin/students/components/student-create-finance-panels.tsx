'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import type {
  EligibleFeePlan,
  EnrollmentFinancialSummary,
  EnrollmentPlanLine,
  EnrollmentPlanPreviewResult,
  FeePlanSuggestResult,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import {
  enrollmentPlanLineAmountParts,
  enrollmentPlanLinePricingModeKey,
  financeCustomizationReasonOptions,
  financialSummaryRows,
  selectedFinancePeriods,
} from '../utils/student-enrollment-finance';

function DiscountFields({
  label,
  value,
  onChange,
  reasonMode = 'hidden',
}: {
  label: string;
  value: StudentCreateFinanceFormState['planDiscount'];
  onChange: (patch: Partial<StudentCreateFinanceFormState['planDiscount']>) => void;
  reasonMode?: 'hidden' | 'line-specific';
}) {
  const t = useT();
  return (
    <div className="student-create-finance-discount">
      <label className="student-create-form__checkbox">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
        <span>{label}</span>
      </label>
      {value.enabled ? (
        <div className="student-create-finance-discount__fields">
          <label className="student-create-field">
            <span className="tiny muted">{t('admin.student360.create.finance.discountType')}</span>
            <select
              className="input"
              value={value.type}
              onChange={(e) =>
                onChange({ type: e.target.value as StudentCreateFinanceFormState['planDiscount']['type'] })
              }
            >
              <option value="">{t('common.dash')}</option>
              <option value="percent">{t('admin.student360.create.finance.discountPercent')}</option>
              <option value="fixed_amount">{t('admin.student360.create.finance.discountFixed')}</option>
            </select>
          </label>
          <label className="student-create-field">
            <span className="tiny muted">{t('admin.student360.create.finance.discountValue')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={value.value}
              onChange={(e) => onChange({ value: e.target.value })}
            />
          </label>
          {reasonMode === 'line-specific' ? (
            <label className="student-create-field">
              <span className="tiny muted">{t('admin.student360.create.finance.lineDiscountSpecificReason')}</span>
              <select
                className="input"
                value={value.reason}
                onChange={(e) =>
                  onChange({
                    reason: e.target.value as StudentCreateFinanceFormState['planDiscount']['reason'],
                  })
                }
              >
                <option value="">{t('admin.student360.create.finance.inheritGeneralReason')}</option>
                {financeCustomizationReasonOptions().map((reason) => (
                  <option key={reason} value={reason}>
                    {t(`admin.student360.create.finance.reasons.${reason}`)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function StudentCreateFinancePlanPicker({
  suggest,
  financeState,
  onSelectPlan,
}: {
  suggest: FeePlanSuggestResult;
  financeState: StudentCreateFinanceFormState;
  onSelectPlan: (planId: number) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const plans = suggest.eligible_plans ?? [];
  if (plans.length <= 1 && suggest.allowed_actions?.select_other_plan !== true) return null;

  const selectedId = financeState.selectedFeePlanId ?? suggest.fee_plan_id;

  return (
    <section className="student-create-finance-plan-picker">
      <div className="student-create-finance-plan-picker__head">
        <h3 className="student-create-fee-plan__subtitle">{t('admin.student360.create.finance.planChoiceTitle')}</h3>
        <p className="tiny muted">
          {t('admin.student360.create.finance.suggestedPlanLabel')}: {suggest.fee_plan_name}
        </p>
      </div>
      <ul className="student-create-finance-plan-picker__list">
        {plans.map((plan: EligibleFeePlan) => {
          const selected = plan.id === selectedId;
          return (
            <li key={plan.id}>
              <button
                type="button"
                className={`student-create-finance-plan-picker__card${selected ? ' student-create-finance-plan-picker__card--selected' : ''}`}
                onClick={() => onSelectPlan(plan.id)}
              >
                <span className="student-create-finance-plan-picker__name" dir="auto">
                  {plan.name}
                </span>
                {plan.is_default_for_level ? (
                  <span className="student-create-finance-plan-picker__badge">
                    {t('admin.student360.create.finance.defaultPlanBadge')}
                  </span>
                ) : null}
                {plan.summary?.expected_total != null ? (
                  <span className="student-create-finance-plan-picker__total mono">
                    {formatFinanceCurrency(plan.summary.expected_total, suggest.currency, locale)}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function StudentCreateFinancePlanLines({
  lines,
  currency,
}: {
  lines: EnrollmentPlanLine[];
  currency: FeePlanSuggestResult['currency'];
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  if (lines.length === 0) return null;

  return (
    <section className="student-create-finance-lines">
      <h3 className="student-create-fee-plan__subtitle">{t('admin.student360.create.finance.planLinesTitle')}</h3>
      <div className="student-create-finance-lines__grid">
        {lines.map((line) => {
          const parts = enrollmentPlanLineAmountParts(line);
          const modeKey = enrollmentPlanLinePricingModeKey(line);
          return (
            <article key={line.line_id} className="student-create-finance-lines__card">
              <header className="student-create-finance-lines__card-head">
                <h4 dir="auto">{line.fee_type_name}</h4>
                <span className="student-create-finance-lines__mode">{t(modeKey)}</span>
              </header>
              <p className="student-create-finance-lines__amount mono">
                {parts.primary != null
                  ? formatFinanceCurrency(parts.primary, currency, locale)
                  : t('common.dash')}
              </p>
              {parts.installmentCount != null &&
              parts.installmentCount > 1 &&
              parts.installmentAmount != null ? (
                <p className="tiny muted">
                  {t('admin.student360.create.finance.lineInstallmentFormula', {
                    amount: formatFinanceCurrency(parts.installmentAmount, currency, locale),
                    count: parts.installmentCount,
                    total:
                      parts.totalAmount != null
                        ? formatFinanceCurrency(parts.totalAmount, currency, locale)
                        : t('common.dash'),
                  })}
                </p>
              ) : null}
              {line.due_date ? (
                <p className="tiny muted">
                  {t('admin.student360.create.finance.dueOn', {
                    date: formatDate(line.due_date),
                  })}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function StudentCreateFinanceSummary({
  summary,
  lines,
  currency,
}: {
  summary: EnrollmentFinancialSummary | null | undefined;
  lines?: EnrollmentPlanLine[];
  currency: FeePlanSuggestResult['currency'];
}) {
  const t = useT();
  const { locale } = useLocale();
  const rows = financialSummaryRows(summary, lines);
  if (rows.length === 0) return null;

  return (
    <section className="student-create-finance-summary">
      <h3 className="student-create-fee-plan__subtitle">{t('admin.student360.create.finance.summaryTitle')}</h3>
      <dl className="student-create-finance-summary__grid">
        {rows.map((row) => (
          <div key={row.key} className="student-create-finance-summary__row">
            <dt>{t(`admin.student360.create.finance.summary.${row.key}`)}</dt>
            <dd className="mono">{formatFinanceCurrency(row.value, currency, locale)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StudentCreateFinancePreview({
  preview,
  loading,
  error,
  currency,
}: {
  preview: EnrollmentPlanPreviewResult | null;
  loading: boolean;
  error: string | null;
  currency: FeePlanSuggestResult['currency'];
}) {
  const t = useT();
  const { locale } = useLocale();

  return (
    <section className="student-create-finance-preview" aria-live="polite">
      <h3 className="student-create-fee-plan__subtitle">{t('admin.student360.create.finance.previewTitle')}</h3>
      {error ? <p className="student-create-finance-preview__error">{error}</p> : null}
      {loading ? <p className="tiny muted">{t('admin.student360.create.finance.previewLoading')}</p> : null}
      {preview ? (
        <dl className="student-create-finance-summary__grid">
          {preview.original_total != null ? (
            <div className="student-create-finance-summary__row">
              <dt>{t('admin.student360.create.finance.preview.originalTotal')}</dt>
              <dd className="mono">{formatFinanceCurrency(preview.original_total, currency, locale)}</dd>
            </div>
          ) : null}
          {preview.discount_total != null ? (
            <div className="student-create-finance-summary__row">
              <dt>{t('admin.student360.create.finance.preview.discountTotal')}</dt>
              <dd className="mono">{formatFinanceCurrency(preview.discount_total, currency, locale)}</dd>
            </div>
          ) : null}
          {preview.final_total != null ? (
            <div className="student-create-finance-summary__row student-create-finance-summary__row--emphasis">
              <dt>{t('admin.student360.create.finance.preview.finalTotal')}</dt>
              <dd className="mono">{formatFinanceCurrency(preview.final_total, currency, locale)}</dd>
            </div>
          ) : null}
          {preview.monthly_due_total != null ? (
            <div className="student-create-finance-summary__row">
              <dt>{t('admin.student360.create.finance.preview.monthlyAfterCustomization')}</dt>
              <dd className="mono">{formatFinanceCurrency(preview.monthly_due_total, currency, locale)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}

export type FinanceCustomizationMode =
  | 'plan_discount'
  | 'line_discounts'
  | 'one_time_lines'
  | 'periods';

function resolveFinanceCustomizationModes(suggest: FeePlanSuggestResult): FinanceCustomizationMode[] {
  const contract = suggest.customization_contract;
  const allowCustomizeAmounts = suggest.allowed_actions?.customize_amounts !== false;
  const allowCustomizeDueDates = suggest.allowed_actions?.customize_due_dates !== false;
  const allowCustomizePeriods = suggest.allowed_actions?.customize_periods !== false;
  const planLines = suggest.plan_lines ?? [];
  const modes: FinanceCustomizationMode[] = [];

  if (contract?.supports_plan_discount !== false) {
    modes.push('plan_discount');
  }
  if (contract?.supports_line_discount !== false && planLines.length > 0) {
    modes.push('line_discounts');
  }
  const hasOneTimeLines =
    planLines.some((line) => line.is_one_time || line.frequency === 'one_time') ||
    (contract?.one_time_lines?.length ?? 0) > 0;
  if (hasOneTimeLines) {
    modes.push('one_time_lines');
  }
  if (
    (suggest.suggested_periods?.length ?? 0) > 0 &&
    (allowCustomizePeriods || allowCustomizeAmounts || allowCustomizeDueDates)
  ) {
    modes.push('periods');
  }

  return modes;
}

export function StudentCreateFinanceCustomization({
  suggest,
  financeState,
  previewError,
  onFinanceChange,
}: {
  suggest: FeePlanSuggestResult;
  financeState: StudentCreateFinanceFormState;
  previewError: string | null;
  onFinanceChange: (patch: Partial<StudentCreateFinanceFormState>) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const contract = suggest.customization_contract;
  const allowCustomizeAmounts = suggest.allowed_actions?.customize_amounts !== false;
  const allowCustomizeDueDates = suggest.allowed_actions?.customize_due_dates !== false;
  const allowCustomizePeriods = suggest.allowed_actions?.customize_periods !== false;
  const allowNotes = suggest.allowed_actions?.notes !== false;
  const selectedPeriods = selectedFinancePeriods(suggest, financeState);
  const firstDue = selectedPeriods[0]?.due_date;
  const lastDue = selectedPeriods[selectedPeriods.length - 1]?.due_date;
  const oneTimeLineRecords = Object.entries(financeState.oneTimeLines);
  const planLines = suggest.plan_lines ?? [];
  const availableModes = useMemo(() => resolveFinanceCustomizationModes(suggest), [suggest]);
  const [selectedMode, setSelectedMode] = useState<FinanceCustomizationMode | null>(null);

  useEffect(() => {
    setSelectedMode((previous) =>
      previous && availableModes.includes(previous) ? previous : (availableModes[0] ?? null),
    );
  }, [availableModes, suggest.fee_plan_id]);

  return (
    <div className="student-create-fee-plan__customize-panel">
      {(previewError || financeState.customizePlan) && previewError ? (
        <p className="student-create-finance-preview__error" role="alert">
          {previewError}
        </p>
      ) : null}

      <label className="student-create-field">
        <span className="tiny muted">{t('admin.student360.create.finance.customizationReason')}</span>
        <select
          className="input"
          value={financeState.customizationReason}
          onChange={(e) =>
            onFinanceChange({
              customizationReason: e.target.value as StudentCreateFinanceFormState['customizationReason'],
            })
          }
        >
          <option value="">{t('common.dash')}</option>
          {financeCustomizationReasonOptions().map((reason) => (
            <option key={reason} value={reason}>
              {t(`admin.student360.create.finance.reasons.${reason}`)}
            </option>
          ))}
        </select>
        <span className="tiny muted">{t('admin.student360.create.finance.customizationReasonHint')}</span>
      </label>

      {availableModes.length > 0 ? (
        <div className="student-create-finance-customize-modes">
          <span className="tiny muted student-create-finance-customize-modes__label">
            {t('admin.student360.create.finance.customizationTypeLabel')}
          </span>
          <ul className="student-create-finance-customize-modes__list">
            {availableModes.map((mode) => {
              const active = selectedMode === mode;
              return (
                <li key={mode}>
                  <button
                    type="button"
                    className={`student-create-finance-customize-modes__chip${active ? ' student-create-finance-customize-modes__chip--active' : ''}`}
                    aria-pressed={active}
                    onClick={() => setSelectedMode(mode)}
                  >
                    {t(`admin.student360.create.finance.customizationTypes.${mode}`)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {allowNotes && selectedMode ? (
        <label className="student-create-field">
          <span className="tiny muted">{t('admin.student360.create.finance.customizationNotes')}</span>
          <textarea
            className="input"
            rows={2}
            value={financeState.customizationNotes}
            onChange={(e) => onFinanceChange({ customizationNotes: e.target.value })}
          />
        </label>
      ) : null}

      {selectedMode === 'plan_discount' && contract?.supports_plan_discount !== false ? (
        <DiscountFields
          label={t('admin.student360.create.finance.planDiscount')}
          value={financeState.planDiscount}
          onChange={(patch) =>
            onFinanceChange({ planDiscount: { ...financeState.planDiscount, ...patch } })
          }
        />
      ) : null}

      {selectedMode === 'line_discounts' &&
      contract?.supports_line_discount !== false &&
      planLines.length > 0 ? (
        <div className="student-create-finance-line-discounts">
          <h4 className="student-create-finance-line-discounts__title">
            {t('admin.student360.create.finance.lineDiscounts')}
          </h4>
          {planLines.map((line) => {
            const discount = financeState.lineDiscounts[String(line.line_id)] ?? {
              enabled: false,
              type: '',
              value: '',
              reason: '',
            };
            const amount = line.total_amount ?? line.amount ?? line.base_amount;
            return (
              <DiscountFields
                key={line.line_id}
                label={`${line.fee_type_name}${amount != null ? ` — ${formatFinanceCurrency(amount, suggest.currency, locale)}` : ''}`}
                value={discount}
                reasonMode="line-specific"
                onChange={(patch) =>
                  onFinanceChange({
                    lineDiscounts: {
                      ...financeState.lineDiscounts,
                      [String(line.line_id)]: { ...discount, ...patch },
                    },
                  })
                }
              />
            );
          })}
        </div>
      ) : null}

      {selectedMode === 'one_time_lines' && oneTimeLineRecords.length > 0 ? (
        <div className="student-create-finance-one-time">
          <h4 className="student-create-finance-one-time__title">
            {t('admin.student360.create.finance.oneTimeLinesTitle')}
          </h4>
          {oneTimeLineRecords.map(([lineId, lineState]) => {
            const line = planLines.find((item) => String(item.line_id) === lineId);
            const amount = line?.total_amount ?? line?.amount ?? line?.base_amount;
            return (
              <div key={lineId} className="student-create-finance-one-time__row">
                <label className="student-create-form__checkbox">
                  <input
                    type="checkbox"
                    checked={lineState.selected}
                    onChange={(e) =>
                      onFinanceChange({
                        oneTimeLines: {
                          ...financeState.oneTimeLines,
                          [lineId]: { ...lineState, selected: e.target.checked },
                        },
                      })
                    }
                  />
                  <span dir="auto">
                    {line?.fee_type_name ?? lineId}
                    {amount != null
                      ? ` — ${formatFinanceCurrency(amount, suggest.currency, locale)}`
                      : ''}
                  </span>
                </label>
                <div className="student-create-finance-one-time__fields">
                  <label className="student-create-field">
                    <span className="tiny muted">{t('admin.student360.create.finance.amountOverride')}</span>
                    <input
                      className="input input--sm"
                      type="number"
                      min="0"
                      step="0.01"
                      value={lineState.amountOverride}
                      onChange={(e) =>
                        onFinanceChange({
                          oneTimeLines: {
                            ...financeState.oneTimeLines,
                            [lineId]: { ...lineState, amountOverride: e.target.value },
                          },
                        })
                      }
                    />
                  </label>
                  <label className="student-create-field">
                    <span className="tiny muted">{t('admin.student360.create.finance.dueDateOverride')}</span>
                    <input
                      className="input input--sm"
                      type="date"
                      value={lineState.dueDateOverride}
                      onChange={(e) =>
                        onFinanceChange({
                          oneTimeLines: {
                            ...financeState.oneTimeLines,
                            [lineId]: { ...lineState, dueDateOverride: e.target.value },
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {selectedMode === 'periods' ? (
      <div className="student-create-fee-plan__customize-table-wrap">
        <h4 className="student-create-finance-periods__title">{t('admin.student360.create.finance.periodsTitle')}</h4>
        <table className="student-create-fee-plan__customize-table">
          <thead>
            <tr>
              <th>{t('admin.student360.create.finance.month')}</th>
              <th>{t('admin.student360.create.finance.include')}</th>
              {allowCustomizeAmounts ? <th>{t('admin.student360.create.finance.amountOverride')}</th> : null}
              {allowCustomizeDueDates ? <th>{t('admin.student360.create.finance.dueDateOverride')}</th> : null}
            </tr>
          </thead>
          <tbody>
            {suggest.suggested_periods.map((period) => {
              const override = financeState.periodOverrides[period.period_key] ?? {
                selected: period.selected !== false,
                amountOverride: '',
                dueDateOverride: '',
              };
              return (
                <tr key={period.period_key}>
                  <td dir="auto">{period.label}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={override.selected}
                      disabled={!allowCustomizePeriods}
                      onChange={(e) =>
                        onFinanceChange({
                          periodOverrides: {
                            ...financeState.periodOverrides,
                            [period.period_key]: {
                              ...override,
                              selected: e.target.checked,
                            },
                          },
                        })
                      }
                    />
                  </td>
                  {allowCustomizeAmounts ? (
                    <td>
                      <input
                        className="input input--sm"
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!period.allow_amount_override && period.amount != null}
                        placeholder={
                          period.amount != null ? String(period.amount) : t('common.dash')
                        }
                        value={override.amountOverride}
                        onChange={(e) =>
                          onFinanceChange({
                            periodOverrides: {
                              ...financeState.periodOverrides,
                              [period.period_key]: {
                                ...override,
                                amountOverride: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </td>
                  ) : null}
                  {allowCustomizeDueDates ? (
                    <td>
                      <input
                        className="input input--sm"
                        type="date"
                        value={override.dueDateOverride || period.due_date}
                        onChange={(e) =>
                          onFinanceChange({
                            periodOverrides: {
                              ...financeState.periodOverrides,
                              [period.period_key]: {
                                ...override,
                                dueDateOverride: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      ) : null}

      {selectedMode === 'periods' && firstDue && lastDue ? (
        <p className="tiny muted">
          {t('admin.student360.create.finance.previewRange', {
            first: formatDate(firstDue),
            last: formatDate(lastDue),
            count: selectedPeriods.length,
          })}
        </p>
      ) : null}
    </div>
  );
}
