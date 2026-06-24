'use client';

import Link from 'next/link';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { formatFinanceCurrency } from '../utils/student-finance-format';
import { ensureFinancePeriodOverrides, resolveFinanceSuggestedPeriods, resolveNoDefaultFeePlanMessage, selectedFinancePeriods } from '../utils/student-enrollment-finance';
import {
  StudentCreateFinanceCustomization,
  StudentCreateFinancePlanLines,
  StudentCreateFinancePlanPicker,
  StudentCreateFinancePreview,
  StudentCreateFinanceSummary,
} from './student-create-finance-panels';
import { StudentCreateStyledSection } from './student-create-section-header';
import type {
  EnrollmentPlanPreviewResult,
  FeePlanSuggestError,
  FeePlanSuggestResult,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="student-create-fee-plan__stat">
      <span className="student-create-fee-plan__stat-label">{label}</span>
      <span className="student-create-fee-plan__stat-value" dir="auto">
        {value}
      </span>
    </div>
  );
}

function FeePlanLoadingState({ message }: { message: string }) {
  const t = useT();
  return (
    <StudentCreateStyledSection
      icon="finance"
      title={t('admin.student360.create.finance.suggestedPlanTitle')}
      lead={t('admin.student360.create.financeStepLead')}
      className="student-create-fee-plan"
    >
      <div className="student-create-fee-plan__state student-create-fee-plan__state--loading" aria-live="polite">
        <div className="student-create-fee-plan__skeleton student-create-fee-plan__skeleton--hero" />
        <div className="student-create-fee-plan__skeleton-row">
          <div className="student-create-fee-plan__skeleton student-create-fee-plan__skeleton--stat" />
          <div className="student-create-fee-plan__skeleton student-create-fee-plan__skeleton--stat" />
          <div className="student-create-fee-plan__skeleton student-create-fee-plan__skeleton--stat" />
        </div>
        <p className="student-create-fee-plan__state-text">{message}</p>
      </div>
    </StudentCreateStyledSection>
  );
}

function FeePlanEmptyState({ message }: { message: string }) {
  const t = useT();
  return (
    <StudentCreateStyledSection
      icon="finance"
      title={t('admin.student360.create.finance.suggestedPlanTitle')}
      lead={t('admin.student360.create.financeStepLead')}
      className="student-create-fee-plan"
    >
      <div className="student-create-fee-plan__state student-create-fee-plan__state--empty">
        <span className="student-create-fee-plan__state-icon" aria-hidden="true">
          ◌
        </span>
        <p className="student-create-fee-plan__state-text">{message}</p>
      </div>
    </StudentCreateStyledSection>
  );
}

export function StudentCreateFeePlanSection({
  suggest,
  loading,
  error,
  levelSelected,
  financeState,
  planChangeWarning,
  preview,
  previewLoading,
  previewError,
  onFinanceChange,
  onSelectPlan,
  onRetry,
}: {
  suggest: FeePlanSuggestResult | null;
  loading: boolean;
  error: FeePlanSuggestError | null;
  levelSelected: boolean;
  financeState: StudentCreateFinanceFormState;
  planChangeWarning: boolean;
  preview: EnrollmentPlanPreviewResult | null;
  previewLoading: boolean;
  previewError: string | null;
  onFinanceChange: (patch: Partial<StudentCreateFinanceFormState>) => void;
  onSelectPlan: (planId: number) => void;
  onRetry?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();

  if (!levelSelected) {
    return <FeePlanEmptyState message={t('admin.student360.create.finance.selectLevelForPlan')} />;
  }

  if (loading) {
    return <FeePlanLoadingState message={t('admin.student360.create.finance.loading')} />;
  }

  if (error?.code === 'no_default_fee_plan_for_level') {
    const message = resolveNoDefaultFeePlanMessage(error, t);
    const candidates = error.candidate_plans ?? [];
    return (
      <StudentCreateStyledSection
        icon="finance"
        title={t('admin.student360.create.finance.noPlanTitle')}
        lead={t('admin.student360.create.financeStepLead')}
        className="student-create-fee-plan"
      >
        <div className="student-create-fee-plan__alert" role="alert">
          <p>{message}</p>
          {candidates.length > 0 ? (
            <div className="student-create-fee-plan__candidates">
              <p className="student-create-field__hint">{t('admin.student360.create.finance.candidatePlans')}</p>
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
      </StudentCreateStyledSection>
    );
  }

  if (error) {
    return (
      <StudentCreateStyledSection
        icon="finance"
        title={t('admin.student360.create.finance.suggestedPlanTitle')}
        lead={t('admin.student360.create.financeStepLead')}
        className="student-create-fee-plan"
      >
        <div role="alert">
          <p className="student-create-form__notice">{t('admin.student360.create.finance.loadError')}</p>
          {onRetry ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
              {t('common.retry')}
            </button>
          ) : null}
        </div>
      </StudentCreateStyledSection>
    );
  }

  if (!suggest) {
    return <FeePlanEmptyState message={t('admin.student360.create.finance.waitingEnrollment')} />;
  }

  const selectedPeriods = selectedFinancePeriods(suggest, financeState);
  const firstDue = selectedPeriods[0]?.due_date;
  const lastDue = selectedPeriods[selectedPeriods.length - 1]?.due_date;
  const periodCount = suggest.suggested_period_count ?? suggest.suggested_periods.length;
  const performanceWindow =
    suggest.performance_start && suggest.performance_end
      ? `${formatDate(suggest.performance_start)} — ${formatDate(suggest.performance_end)}`
      : null;
  const contextTags = [
    suggest.academic_year?.name,
    suggest.level?.name,
    suggest.season_name,
  ].filter(Boolean) as string[];
  const summary = suggest.financial_summary;
  const planLines = suggest.plan_lines ?? [];

  return (
    <StudentCreateStyledSection
      icon="finance"
      title={t('admin.student360.create.finance.suggestedPlanTitle')}
      lead={performanceWindow ?? t('admin.student360.create.financeStepLead')}
      className="student-create-fee-plan"
    >
      {planChangeWarning ? (
        <p className="student-create-fee-plan__warning" role="status">
          {t('admin.student360.create.finance.planChangeWarning')}
        </p>
      ) : null}

      <StudentCreateFinancePlanPicker
        suggest={suggest}
        financeState={financeState}
        onSelectPlan={onSelectPlan}
      />

      <article className="student-create-fee-plan__hero">
        <div className="student-create-fee-plan__hero-main">
          <p className="student-create-fee-plan__eyebrow">
            {t('admin.student360.create.steps.finance')}
            {suggest.fee_plan_id ? (
              <span className="student-create-fee-plan__plan-id mono">#{suggest.fee_plan_id}</span>
            ) : null}
          </p>
          <h3 className="student-create-fee-plan__plan-name" dir="auto">
            {suggest.fee_plan_name}
          </h3>
          {contextTags.length > 0 ? (
            <div className="student-create-fee-plan__tags">
              {contextTags.map((tag) => (
                <span key={tag} className="student-create-fee-plan__tag" dir="auto">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {(summary?.expected_total ?? suggest.total_due) != null ? (
            <p className="student-create-fee-plan__total-due">
              <span className="student-create-fee-plan__total-label">
                {t('admin.student360.create.finance.totalDue')}
              </span>
              <span className="student-create-fee-plan__total-value">
                {formatFinanceCurrency(
                  summary?.expected_total ?? suggest.total_due ?? 0,
                  suggest.currency,
                  locale,
                )}
              </span>
            </p>
          ) : null}
        </div>

        <div className="student-create-fee-plan__stats" role="list">
          <MetaStat
            label={t('admin.student360.create.finance.suggestedMonths')}
            value={String(periodCount)}
          />
          {suggest.due_day != null ? (
            <MetaStat
              label={t('admin.student360.create.finance.dueDay')}
              value={String(suggest.due_day)}
            />
          ) : null}
          {firstDue && lastDue ? (
            <MetaStat
              label={t('admin.student360.create.finance.installmentRange')}
              value={`${formatDate(firstDue)} — ${formatDate(lastDue)}`}
            />
          ) : null}
        </div>
      </article>

      <StudentCreateFinancePlanLines lines={planLines} currency={suggest.currency} />
      <StudentCreateFinanceSummary summary={summary} lines={planLines} currency={suggest.currency} />

      <div className="student-create-fee-plan__periods-card">
        <div className="student-create-fee-plan__periods-head">
          <h3 className="student-create-fee-plan__subtitle">
            {t('admin.student360.create.finance.includedMonths')}
          </h3>
          <span className="student-create-fee-plan__periods-count">
            {selectedPeriods.length}/{suggest.suggested_periods.length}
          </span>
        </div>
        <ul className="student-create-fee-plan__period-grid">
          {suggest.suggested_periods.map((period) => {
            const override = financeState.periodOverrides[period.period_key];
            const selected = override?.selected ?? period.selected !== false;
            const dueLabel = formatDate(
              financeState.customizePlan && override?.dueDateOverride
                ? override.dueDateOverride
                : period.due_date,
            );
            return (
              <li
                key={period.period_key}
                className={`student-create-fee-plan__period-chip${selected ? '' : ' student-create-fee-plan__period-chip--off'}`}
              >
                <span
                  className={`student-create-fee-plan__period-icon${selected ? ' student-create-fee-plan__period-icon--on' : ''}`}
                  aria-hidden="true"
                >
                  {selected ? '✓' : '○'}
                </span>
                <span className="student-create-fee-plan__period-body">
                  <span className="student-create-fee-plan__period-label" dir="auto">
                    {period.label}
                  </span>
                  <span className="student-create-fee-plan__period-due">
                    {t('admin.student360.create.finance.dueOn', { date: dueLabel })}
                  </span>
                  {period.amount != null ? (
                    <span className="student-create-fee-plan__period-amount mono">
                      {formatFinanceCurrency(period.amount, suggest.currency, locale)}
                    </span>
                  ) : null}
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
          <ul className="student-create-fee-plan__excluded-chips">
            {suggest.excluded_periods.map((period) => (
              <li key={period.period_key} className="student-create-fee-plan__excluded-chip" dir="auto">
                {period.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="student-create-fee-plan__customize-box">
        <label className="student-create-form__checkbox student-create-fee-plan__customize-toggle">
          <input
            type="checkbox"
            checked={financeState.customizePlan}
            onChange={(e) => {
              const checked = e.target.checked;
              if (!checked) {
                onFinanceChange({ customizePlan: false });
                return;
              }
              onFinanceChange({
                customizePlan: true,
                periodOverrides: ensureFinancePeriodOverrides(
                  resolveFinanceSuggestedPeriods(suggest),
                  financeState.periodOverrides,
                ),
              });
            }}
          />
          <span className="student-create-form__checkbox-text">
            <span>{t('admin.student360.create.finance.customizePlan')}</span>
            <span className="tiny muted">
              {t('admin.student360.create.finance.customizePlanHint')}
            </span>
          </span>
        </label>

        {financeState.customizePlan ? (
          <StudentCreateFinanceCustomization
            suggest={suggest}
            financeState={financeState}
            previewError={previewError}
            onFinanceChange={onFinanceChange}
          />
        ) : null}
      </div>

      {financeState.customizePlan ? (
        <StudentCreateFinancePreview
          preview={preview}
          loading={previewLoading}
          error={previewError}
          currency={suggest.currency}
        />
      ) : null}
    </StudentCreateStyledSection>
  );
}
