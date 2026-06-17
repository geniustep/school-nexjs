'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { FinanceStatusBadge } from '@/features/admin/finance/finance-status-badge';
import { feePlanLevelScopeLabel } from '@/features/admin/finance/fee-plans/fee-plan-normalizer';
import type { FeePlanScopeCycleGroup } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import { useT } from '@/features/i18n/locale-context';
import { feePlanState } from '@/lib/utils/finance';
import type { FeePlan } from '@/types/finance';

export function FeePlanAssignSourceCard({
  plan,
  yearLabel,
  levelLabel,
  expectedTotal,
}: {
  plan: FeePlan;
  yearLabel: string;
  levelLabel: string;
  expectedTotal?: number | null;
}) {
  const t = useT();
  const lineCount = plan.lines?.length ?? 0;
  const state = feePlanState(plan);

  return (
    <section className="card fee-plan-assign-source" data-testid="fee-plan-assign-source">
      <div className="fee-plan-assign-source__head">
        <div className="fee-plan-assign-source__intro">
          <p className="fee-plan-assign-source__eyebrow">{t('admin.finance.assignFlow.sourcePlan')}</p>
          <h2 className="fee-plan-assign-source__name">{plan.name}</h2>
          <div className="fee-plan-assign-source__meta">
            <FinanceStatusBadge state={state} />
            <span className="muted">{yearLabel}</span>
          </div>
        </div>
        {expectedTotal != null && expectedTotal > 0 ? (
          <div className="fee-plan-assign-source__total">
            <span className="fee-plan-assign-source__total-label">
              {t('admin.finance.feePlansWorkspace.summaryExpectedTotal')}
            </span>
            <FinanceMoney
              amount={expectedTotal}
              currency={plan.currency}
              className="mono finance-amount fee-plan-assign-source__total-value"
            />
          </div>
        ) : null}
      </div>

      <dl className="fee-plan-assign-source__grid">
        <div>
          <dt>{t('nav.levels')}</dt>
          <dd dir="auto">{levelLabel}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.lineCount')}</dt>
          <dd>{lineCount}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.currencyLabel')}</dt>
          <dd>{plan.currency ?? t('common.dash')}</dd>
        </div>
      </dl>

      <div className="fee-plan-assign-source__foot">
        <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost btn--sm">
          {t('admin.finance.feePlansWorkspace.viewDetails')}
        </Link>
      </div>
    </section>
  );
}

export function FeePlanAssignStepper({
  steps,
  current,
}: {
  steps: { id: string; label: string; done: boolean }[];
  current: string;
}) {
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <nav className="card fee-plan-assign-stepper" aria-label="Progress">
      <ol className="fee-plan-assign-stepper__list">
        {steps.map((step, index) => {
          const isCurrent = step.id === current;
          const isDone = step.done || index < currentIndex;
          return (
            <li
              key={step.id}
              className={[
                'fee-plan-assign-stepper__item',
                isCurrent ? 'fee-plan-assign-stepper__item--current' : '',
                isDone ? 'fee-plan-assign-stepper__item--done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="fee-plan-assign-stepper__index">{isDone ? '✓' : index + 1}</span>
              <span className="fee-plan-assign-stepper__label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function useFeePlanScopeLabels(scopeGroups: FeePlanScopeCycleGroup[]) {
  const t = useT();
  return useMemo(
    () => ({
      selectLevels: t('admin.finance.feePlansWorkspace.selectLevels'),
      allInCycle: (cycleName: string) =>
        t('admin.finance.feePlansWorkspace.levelScopeAllInCycle', { cycle: cycleName }),
      compact: (cycles: number, count: number) =>
        t('admin.finance.feePlansWorkspace.levelScopeCompact', { cycles, count }),
      noScope: t('admin.finance.feePlansWorkspace.noScopeDefined'),
    }),
    [t],
  );
}

export function feePlanLevelLabel(plan: FeePlan, scopeGroups: FeePlanScopeCycleGroup[], scopeLabels: ReturnType<typeof useFeePlanScopeLabels>) {
  return feePlanLevelScopeLabel(plan, scopeGroups, scopeLabels);
}
