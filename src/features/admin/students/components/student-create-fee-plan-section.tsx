'use client';

import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { StudentFinanceMoney } from './student-finance-money';
import {
  getFeePlanSuggestPendingReason,
  resolveFeePlanSuggestEmptyMessage,
  resolveNoDefaultFeePlanMessage,
} from '../utils/student-enrollment-finance';
import type { StudentProfileFormState } from '../utils/student-profile';
import {
  StudentCreateFinancePlanLines,
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
      <span className="student-create-fee-plan__stat-value" dir="auto">{value}</span>
    </div>
  );
}

function FinanceShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <StudentCreateStyledSection
      icon="finance"
      title={t('admin.student360.create.finance.suggestedPlanTitle')}
      lead={t('admin.student360.create.financeStepLead')}
      className="student-create-fee-plan"
    >
      {children}
    </StudentCreateStyledSection>
  );
}

export function StudentCreateFeePlanSection({
  suggest,
  loading,
  error,
  levelSelected,
  profileState,
  schoolId,
  onRetry,
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
    return (
      <FinanceShell>
        <div className="student-create-fee-plan__state student-create-fee-plan__state--empty">
          <p className="student-create-fee-plan__state-text">
            {t('admin.student360.create.finance.selectLevelForPlan')}
          </p>
        </div>
      </FinanceShell>
    );
  }

  if (loading) {
    return (
      <FinanceShell>
        <div className="student-create-fee-plan__state student-create-fee-plan__state--loading" aria-live="polite">
          <div className="student-create-fee-plan__skeleton student-create-fee-plan__skeleton--hero" />
          <p className="student-create-fee-plan__state-text">
            {t('admin.student360.create.finance.loading')}
          </p>
        </div>
      </FinanceShell>
    );
  }

  if (error) {
    const message =
      error.code === 'no_default_fee_plan_for_level' ||
      error.code === 'no_eligible_fee_plan_for_level'
        ? resolveNoDefaultFeePlanMessage(error, t)
        : error.message?.trim() || t('admin.student360.create.finance.loadError');

    return (
      <FinanceShell>
        <div className="student-create-fee-plan__alert" role="alert">
          <p>{message}</p>
          {onRetry ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
              {t('common.retry')}
            </button>
          ) : null}
        </div>
      </FinanceShell>
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
      <FinanceShell>
        <div className="student-create-fee-plan__state student-create-fee-plan__state--empty">
          <p className="student-create-fee-plan__state-text">
            {resolveFeePlanSuggestEmptyMessage(pendingReason, t)}
          </p>
        </div>
      </FinanceShell>
    );
  }

  const selectedPeriods = suggest.suggested_periods.filter((period) => period.selected !== false);
  const firstDue = selectedPeriods[0]?.due_date;
  const lastDue = selectedPeriods[selectedPeriods.length - 1]?.due_date;
  const periodCount = suggest.suggested_period_count ?? selectedPeriods.length;
  const contextTags = [suggest.academic_year?.name, suggest.level?.name, suggest.season_name].filter(Boolean) as string[];
  const summary = suggest.financial_summary;
  const planLines = suggest.plan_lines ?? [];

  return (
    <FinanceShell>
      <article className="student-create-fee-plan__hero student-create-finance-card student-create-finance-card--hero">
        <div className="student-create-fee-plan__hero-main">
          <p className="student-create-fee-plan__eyebrow">{t('admin.student360.create.steps.finance')}</p>
          <h3 className="student-create-fee-plan__plan-name" dir="auto">{suggest.fee_plan_name}</h3>
          {contextTags.length > 0 ? (
            <div className="student-create-fee-plan__tags">
              {contextTags.map((tag) => (
                <span key={tag} className="student-create-fee-plan__tag" dir="auto">{tag}</span>
              ))}
            </div>
          ) : null}
          {(summary?.expected_total ?? suggest.total_due) != null ? (
            <p className="student-create-fee-plan__total-due">
              <span className="student-create-fee-plan__total-label">{t('admin.student360.create.finance.totalDue')}</span>
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
          <MetaStat label={t('admin.student360.create.finance.suggestedMonths')} value={String(periodCount)} />
          {suggest.due_day != null ? (
            <MetaStat label={t('admin.student360.create.finance.dueDay')} value={String(suggest.due_day)} />
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

      <div className="student-create-fee-plan__periods-card student-create-finance-card">
        <div className="student-create-fee-plan__periods-head">
          <h3 className="student-create-fee-plan__subtitle">{t('admin.student360.create.finance.includedMonths')}</h3>
          <span className="student-create-fee-plan__periods-count">
            {selectedPeriods.length}/{suggest.suggested_periods.length}
          </span>
        </div>
        <ul className="student-create-fee-plan__period-grid">
          {selectedPeriods.map((period) => (
            <li key={period.period_key} className="student-create-fee-plan__period-chip">
              <span className="student-create-fee-plan__period-icon student-create-fee-plan__period-icon--on" aria-hidden="true">✓</span>
              <span className="student-create-fee-plan__period-body">
                <span className="student-create-fee-plan__period-label" dir="auto">{period.label}</span>
                <span className="student-create-fee-plan__period-due">
                  {t('admin.student360.create.finance.dueOn', { date: formatDate(period.due_date) })}
                </span>
                {period.amount != null ? (
                  <span className="student-create-fee-plan__period-amount">
                    <StudentFinanceMoney amount={period.amount} currency={suggest.currency} />
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {suggest.excluded_periods.length > 0 ? (
        <div className="student-create-fee-plan__periods student-create-fee-plan__periods--excluded student-create-finance-card student-create-finance-card--subtle">
          <h3 className="student-create-fee-plan__subtitle">{t('admin.student360.create.finance.excludedMonths')}</h3>
          <ul className="student-create-fee-plan__excluded-chips">
            {suggest.excluded_periods.map((period) => (
              <li key={period.period_key} className="student-create-fee-plan__excluded-chip" dir="auto">{period.label}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </FinanceShell>
  );
}
