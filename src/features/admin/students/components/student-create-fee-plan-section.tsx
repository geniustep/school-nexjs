'use client';

import Link from 'next/link';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import {
  financeCustomizationReasonOptions,
  resolveNoDefaultFeePlanMessage,
  selectedFinancePeriods,
} from '../utils/student-enrollment-finance';
import type {
  FeePlanSuggestError,
  FeePlanSuggestResult,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="student-create-fee-plan__meta-row">
      <dt>{label}</dt>
      <dd dir="auto">{value}</dd>
    </div>
  );
}

export function StudentCreateFeePlanSection({
  suggest,
  loading,
  error,
  levelSelected,
  financeState,
  planChangeWarning,
  onFinanceChange,
  onRetry,
}: {
  suggest: FeePlanSuggestResult | null;
  loading: boolean;
  error: FeePlanSuggestError | null;
  levelSelected: boolean;
  financeState: StudentCreateFinanceFormState;
  planChangeWarning: boolean;
  onFinanceChange: (patch: Partial<StudentCreateFinanceFormState>) => void;
  onRetry?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();

  if (!levelSelected) {
    return (
      <section className="student-create-form__section">
        <p className="tiny muted">{t('admin.student360.create.finance.selectLevelForPlan')}</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="student-create-form__section" aria-live="polite">
        <p className="tiny muted">{t('admin.student360.create.finance.loading')}</p>
      </section>
    );
  }

  if (error?.code === 'no_default_fee_plan_for_level') {
    const message = resolveNoDefaultFeePlanMessage(error, t);
    const candidates = error.candidate_plans ?? [];
    return (
      <section className="student-create-form__section" role="alert">
        <div className="student-create-fee-plan__alert">
          <h2 className="student-create-form__section-title">
            {t('admin.student360.create.finance.noPlanTitle')}
          </h2>
          <p>{message}</p>
          {candidates.length > 0 ? (
            <div className="student-create-fee-plan__candidates">
              <p className="tiny muted">{t('admin.student360.create.finance.candidatePlans')}</p>
              <ul className="student-create-fee-plan__candidate-list">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <Link href={`/admin/finance/fee-plans/${candidate.id}`}>
                      {candidate.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="student-create-form__section" role="alert">
        <p className="student-create-form__notice">{t('admin.student360.create.finance.loadError')}</p>
        {onRetry ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            {t('common.retry')}
          </button>
        ) : null}
      </section>
    );
  }

  if (!suggest) {
    return (
      <section className="student-create-form__section">
        <p className="tiny muted">{t('admin.student360.create.finance.waitingEnrollment')}</p>
      </section>
    );
  }

  const selectedPeriods = selectedFinancePeriods(suggest, financeState);
  const firstDue = selectedPeriods[0]?.due_date;
  const lastDue = selectedPeriods[selectedPeriods.length - 1]?.due_date;
  const allowCustomizeAmounts = suggest.allowed_actions?.customize_amounts !== false;
  const allowCustomizeDueDates = suggest.allowed_actions?.customize_due_dates !== false;
  const allowCustomizePeriods = suggest.allowed_actions?.customize_periods !== false;
  const allowNotes = suggest.allowed_actions?.notes !== false;

  return (
    <section className="student-create-form__section student-create-fee-plan">
      {planChangeWarning ? (
        <p className="student-create-fee-plan__warning" role="status">
          {t('admin.student360.create.finance.planChangeWarning')}
        </p>
      ) : null}

      <article className="student-create-fee-plan__card">
        <h2 className="student-create-fee-plan__title">
          {t('admin.student360.create.finance.suggestedPlanTitle')}
        </h2>
        <dl className="student-create-fee-plan__meta">
          <MetaRow label={t('admin.student360.create.finance.planName')} value={suggest.fee_plan_name} />
          {suggest.season_name ? (
            <MetaRow label={t('admin.student360.create.finance.season')} value={suggest.season_name} />
          ) : null}
          {suggest.academic_year?.name ? (
            <MetaRow
              label={t('admin.academicYearId')}
              value={suggest.academic_year.name}
            />
          ) : null}
          {suggest.level?.name ? (
            <MetaRow label={t('nav.levels')} value={suggest.level.name} />
          ) : null}
          {suggest.performance_start && suggest.performance_end ? (
            <MetaRow
              label={t('admin.student360.create.finance.performanceWindow')}
              value={`${formatDate(suggest.performance_start)} — ${formatDate(suggest.performance_end)}`}
            />
          ) : null}
          {suggest.due_day != null ? (
            <MetaRow
              label={t('admin.student360.create.finance.dueDay')}
              value={String(suggest.due_day)}
            />
          ) : null}
          <MetaRow
            label={t('admin.student360.create.finance.suggestedMonths')}
            value={String(suggest.suggested_period_count ?? suggest.suggested_periods.length)}
          />
          {suggest.total_due != null ? (
            <MetaRow
              label={t('admin.student360.create.finance.totalDue')}
              value={formatFinanceCurrency(suggest.total_due, suggest.currency, locale)}
            />
          ) : null}
        </dl>
      </article>

      <div className="student-create-fee-plan__periods">
        <h3 className="student-create-fee-plan__subtitle">
          {t('admin.student360.create.finance.includedMonths')}
        </h3>
        <ul className="student-create-fee-plan__period-list">
          {suggest.suggested_periods.map((period) => {
            const override = financeState.periodOverrides[period.period_key];
            const selected = override?.selected ?? period.selected !== false;
            const dueLabel = formatDate(
              financeState.customizePlan && override?.dueDateOverride
                ? override.dueDateOverride
                : period.due_date,
            );
            return (
              <li key={period.period_key} className="student-create-fee-plan__period-item">
                <span className="student-create-fee-plan__period-check" aria-hidden="true">
                  {selected ? '✓' : '○'}
                </span>
                <span dir="auto">
                  {period.label} — {t('admin.student360.create.finance.dueOn', { date: dueLabel })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {suggest.excluded_periods.length > 0 ? (
        <div className="student-create-fee-plan__periods student-create-fee-plan__periods--excluded">
          <h3 className="student-create-fee-plan__subtitle">
            {t('admin.student360.create.finance.excludedMonths')}
          </h3>
          <ul className="student-create-fee-plan__period-list">
            {suggest.excluded_periods.map((period) => (
              <li key={period.period_key} dir="auto">
                {period.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="student-create-form__checkbox student-create-fee-plan__customize-toggle">
        <input
          type="checkbox"
          checked={financeState.customizePlan}
          onChange={(e) => onFinanceChange({ customizePlan: e.target.checked })}
        />
        <span className="student-create-form__checkbox-text">
          {t('admin.student360.create.finance.customizePlan')}
        </span>
      </label>

      {financeState.customizePlan ? (
        <div className="student-create-fee-plan__customize-panel">
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
          </label>

          {allowNotes ? (
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

          <div className="student-create-fee-plan__customize-table-wrap">
            <table className="student-create-fee-plan__customize-table">
              <thead>
                <tr>
                  <th>{t('admin.student360.create.finance.month')}</th>
                  <th>{t('admin.student360.create.finance.include')}</th>
                  {allowCustomizeAmounts ? <th>{t('admin.student360.create.finance.amountOverride')}</th> : null}
                  {allowCustomizeDueDates ? (
                    <th>{t('admin.student360.create.finance.dueDateOverride')}</th>
                  ) : null}
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
                              period.amount != null
                                ? String(period.amount)
                                : t('common.dash')
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

          {firstDue && lastDue ? (
            <p className="tiny muted">
              {t('admin.student360.create.finance.previewRange', {
                first: formatDate(firstDue),
                last: formatDate(lastDue),
                count: selectedPeriods.length,
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
