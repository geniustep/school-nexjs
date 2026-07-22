'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { StudentFinanceMoney } from './student-finance-money';
import {
  candidatePlanScopeSummary,
  candidatePlanTotal,
  ensureFinancePeriodOverrides,
  getFeePlanSuggestPendingReason,
  hasNoEligibleFeePlan,
  resolveFinanceSuggestedPeriods,
  resolveFeePlanSuggestEmptyMessage,
  resolveNoDefaultFeePlanMessage,
  resolveSelectableCandidatePlans,
  selectedFinancePeriods,
} from '../utils/student-enrollment-finance';
import type { StudentProfileFormState } from '../utils/student-profile';
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
  FeePlanCandidatePlan,
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

function CandidatePlanCard({
  candidate,
  selected,
  onUse,
}: {
  candidate: FeePlanCandidatePlan;
  selected: boolean;
  onUse: (planId: number) => void;
}) {
  const t = useT();
  const total = candidatePlanTotal(candidate);
  const currency = candidate.currency ? { name: candidate.currency, symbol: candidate.currency } : null;
  const scope = candidatePlanScopeSummary(candidate);
  const year = candidate.academic_year?.name ?? candidate.academic_year_name ?? null;
  const reason = candidate.hint?.trim() || t('admin.student360.create.finance.candidateNotDefaultReason');

  return (
    <li
      className={`student-create-fee-plan__candidate-card${selected ? ' student-create-fee-plan__candidate-card--selected' : ''}`}
    >
      <div className="student-create-fee-plan__candidate-head">
        <span className="student-create-fee-plan__candidate-name" dir="auto">
          {candidate.name}
          <span className="mono tiny muted"> #{candidate.id}</span>
        </span>
        {selected ? (
          <span className="student-create-fee-plan__candidate-badge">
            {t('admin.student360.create.finance.selectedCandidateBadge')}
          </span>
        ) : null}
      </div>
      <dl className="student-create-fee-plan__candidate-meta">
        {year ? (
          <div>
            <dt>{t('admin.student360.create.finance.candidateYear')}</dt>
            <dd dir="auto">{year}</dd>
          </div>
        ) : null}
        {total != null ? (
          <div>
            <dt>{t('admin.student360.create.finance.candidateTotal')}</dt>
            <dd>
              <StudentFinanceMoney amount={total} currency={currency} />
            </dd>
          </div>
        ) : null}
        {scope ? (
          <div>
            <dt>{t('admin.student360.create.finance.candidateScope')}</dt>
            <dd dir="auto">{scope}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('admin.student360.create.finance.candidateReasonLabel')}</dt>
          <dd dir="auto">{reason}</dd>
        </div>
      </dl>
      <div className="student-create-fee-plan__candidate-actions">
        <Link
          className="btn btn--ghost btn--sm"
          href={`/admin/finance/fee-plans/${candidate.id}`}
          target="_blank"
          rel="noreferrer"
        >
          {t('common.view')}
        </Link>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={selected}
          onClick={() => onUse(candidate.id)}
        >
          {selected
            ? t('admin.student360.create.finance.selectedCandidateBadge')
            : t('admin.student360.create.finance.useThisPlan')}
        </button>
      </div>
    </li>
  );
}

export function StudentCreateFeePlanSection({
  suggest,
  loading,
  error,
  levelSelected,
  profileState,
  schoolId,
  financeState,
  planChangeWarning,
  preview,
  previewLoading,
  previewError,
  onFinanceChange,
  onSelectPlan,
  onSkipFinance,
  onRetry,
  canManageDiscounts = true,
}: {
  suggest: FeePlanSuggestResult | null;
  loading: boolean;
  error: FeePlanSuggestError | null;
  levelSelected: boolean;
  profileState: StudentProfileFormState;
  schoolId: number | null;
  financeState: StudentCreateFinanceFormState;
  planChangeWarning: boolean;
  preview: EnrollmentPlanPreviewResult | null;
  previewLoading: boolean;
  previewError: string | null;
  onFinanceChange: (patch: Partial<StudentCreateFinanceFormState>) => void;
  onSelectPlan: (planId: number) => void;
  onSkipFinance?: () => void;
  onRetry?: () => void;
  canManageDiscounts?: boolean;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  if (!levelSelected) {
    return <FeePlanEmptyState message={t('admin.student360.create.finance.selectLevelForPlan')} />;
  }

  if (loading) {
    return <FeePlanLoadingState message={t('admin.student360.create.finance.loading')} />;
  }

  if (
    error?.code === 'no_default_fee_plan_for_level' ||
    error?.code === 'no_eligible_fee_plan_for_level'
  ) {
    const selectedId = financeState.selectedFeePlanId;
    const selectableCandidates = resolveSelectableCandidatePlans(error);
    const noEligible = hasNoEligibleFeePlan(error);
    const allCandidates = error.candidate_plans ?? [];
    const selectableIds = new Set(selectableCandidates.map((c) => c.id));
    const otherCandidates = allCandidates.filter((c) => !selectableIds.has(c.id));
    const backendMessage = error.message?.trim();

    if (noEligible) {
      return (
        <StudentCreateStyledSection
          icon="finance"
          title={t('admin.student360.create.finance.noPlanTitle')}
          lead={t('admin.student360.create.financeStepLead')}
          className="student-create-fee-plan"
        >
          <div className="student-create-fee-plan__alert" role="status">
            <p>{t('admin.student360.create.finance.noEligibleTitle')}</p>
            {onSkipFinance ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={onSkipFinance}
              >
                {t('admin.student360.create.finance.createWithoutPlan')}
              </button>
            ) : null}
          </div>
        </StudentCreateStyledSection>
      );
    }

    return (
      <StudentCreateStyledSection
        icon="finance"
        title={t('admin.student360.create.finance.noPlanTitle')}
        lead={t('admin.student360.create.financeStepLead')}
        className="student-create-fee-plan"
      >
        {selectableCandidates.length > 0 ? (
          <div className="student-create-fee-plan__candidates" role="group">
            <p className="student-create-fee-plan__candidates-title">
              {t('admin.student360.create.finance.candidateSelectableTitle')}
            </p>
            <p className="student-create-field__hint">
              {t('admin.student360.create.finance.candidateSelectableHint')}
            </p>
            <ul className="student-create-fee-plan__candidate-cards">
              {selectableCandidates.map((candidate) => (
                <CandidatePlanCard
                  key={candidate.id}
                  candidate={candidate}
                  selected={selectedId === candidate.id}
                  onUse={onSelectPlan}
                />
              ))}
            </ul>
          </div>
        ) : (
          <div className="student-create-fee-plan__alert" role="alert">
            <p>{resolveNoDefaultFeePlanMessage(error, t)}</p>
          </div>
        )}

        {otherCandidates.length > 0 ? (
          <div className="student-create-fee-plan__candidates student-create-fee-plan__candidates--other">
            <p className="student-create-field__hint">
              {t('admin.student360.create.finance.otherCandidatesTitle')}
            </p>
            <ul className="student-create-fee-plan__candidate-list">
              {otherCandidates.map((candidate) => (
                <li key={candidate.id}>
                  <Link href={`/admin/finance/fee-plans/${candidate.id}`} target="_blank" rel="noreferrer">
                    {candidate.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {backendMessage && selectedId != null ? (
          <p className="student-create-form__notice" role="alert">
            {backendMessage}
          </p>
        ) : null}

        {onSkipFinance ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm student-create-fee-plan__skip-inline"
            onClick={onSkipFinance}
          >
            {t('admin.student360.create.finance.createWithoutPlan')}
          </button>
        ) : null}
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
    const pendingReason = getFeePlanSuggestPendingReason({
      schoolId,
      academicYearId: profileState.academicYearId,
      levelId: profileState.levelId,
      enrollmentDate: profileState.actualJoinDate,
    });
    return (
      <FeePlanEmptyState
        message={resolveFeePlanSuggestEmptyMessage(pendingReason, t)}
      />
    );
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
      className={`student-create-fee-plan${financeState.customizePlan ? ' student-create-fee-plan--customizing' : ''}`}
    >
      {planChangeWarning ? (
        <p className="student-create-fee-plan__warning" role="status">
          {t('admin.student360.create.finance.planChangeWarning')}
        </p>
      ) : null}

      <div
        className="student-create-finance-stage student-create-finance-stage--plan"
        data-stage-label={t('admin.student360.create.finance.stagePlan')}
      >
        <StudentCreateFinancePlanPicker
          suggest={suggest}
          financeState={financeState}
          onSelectPlan={onSelectPlan}
        />

        <article className="student-create-fee-plan__hero student-create-finance-card student-create-finance-card--hero">
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
                <StudentFinanceMoney
                  amount={summary?.expected_total ?? suggest.total_due ?? 0}
                  currency={suggest.currency}
                />
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
      </div>

      <div
        className="student-create-finance-stage student-create-finance-stage--breakdown"
        data-stage-label={t('admin.student360.create.finance.stageBreakdown')}
      >
        <StudentCreateFinancePlanLines lines={planLines} currency={suggest.currency} />
        <StudentCreateFinanceSummary summary={summary} lines={planLines} currency={suggest.currency} />

        <div className="student-create-fee-plan__periods-card student-create-finance-card">
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
                    <span className="student-create-fee-plan__period-amount">
                      <StudentFinanceMoney amount={period.amount} currency={suggest.currency} />
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {suggest.excluded_periods.length > 0 ? (
        <div className="student-create-fee-plan__periods student-create-fee-plan__periods--excluded student-create-finance-card student-create-finance-card--subtle">
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
      </div>

      <div
        className={`student-create-finance-stage student-create-finance-stage--customize${financeState.customizePlan ? ' student-create-finance-stage--active' : ''}`}
        data-stage-label={t('admin.student360.create.finance.stageCustomize')}
      >
      <div className="student-create-fee-plan__customize-box student-create-finance-card">
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
            canManageDiscounts={canManageDiscounts}
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
      </div>
    </StudentCreateStyledSection>
  );
}
