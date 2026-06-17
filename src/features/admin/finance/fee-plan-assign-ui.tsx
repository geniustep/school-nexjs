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

export function FeePlanAssignBreadcrumb({ plan }: { plan: FeePlan }) {
  const t = useT();

  return (
    <nav className="fee-plan-assign-breadcrumb" aria-label={t('admin.finance.feePlansWorkspace.detailBreadcrumb')}>
      <Link href="/admin/finance">{t('admin.finance.title')}</Link>
      <span className="fee-plan-assign-breadcrumb__sep" aria-hidden="true">
        /
      </span>
      <Link href="/admin/finance/fee-plans">{t('admin.finance.feePlansWorkspace.breadcrumbPlans')}</Link>
      <span className="fee-plan-assign-breadcrumb__sep" aria-hidden="true">
        /
      </span>
      <Link href={`/admin/finance/fee-plans/${plan.id}`}>{plan.name}</Link>
      <span className="fee-plan-assign-breadcrumb__sep" aria-hidden="true">
        /
      </span>
      <span className="fee-plan-assign-breadcrumb__current">{t('admin.finance.assignFlow.pageTitle')}</span>
    </nav>
  );
}

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
    <section className="fee-plan-assign-aside-card" data-testid="fee-plan-assign-source">
      <div className="fee-plan-assign-aside-card__head">
        <p className="fee-plan-assign-aside-card__label">{t('admin.finance.assignFlow.sourcePlan')}</p>
        <h2 className="fee-plan-assign-aside-card__name">{plan.name}</h2>
        <div className="fee-plan-assign-aside-card__meta">
          <FinanceStatusBadge state={state} />
          <span className="fee-plan-assign-aside-card__year">{yearLabel}</span>
        </div>
      </div>

      {expectedTotal != null && expectedTotal > 0 ? (
        <div className="fee-plan-assign-aside-card__highlight">
          <span className="fee-plan-assign-aside-card__highlight-label">
            {t('admin.finance.feePlansWorkspace.summaryExpectedTotal')}
          </span>
          <FinanceMoney
            amount={expectedTotal}
            currency={plan.currency}
            className="mono finance-amount fee-plan-assign-aside-card__highlight-value"
          />
        </div>
      ) : null}

      <dl className="fee-plan-assign-aside-card__facts">
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

      <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost btn--sm fee-plan-assign-aside-card__link">
        {t('admin.finance.feePlansWorkspace.viewDetails')}
      </Link>
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
    <nav className="fee-plan-assign-stepper" aria-label="Progress">
      <ol className="fee-plan-assign-stepper__list">
        {steps.map((step, index) => {
          const isCurrent = step.id === current;
          const isDone = step.done || index < currentIndex;
          const isLast = index === steps.length - 1;
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
              <span className="fee-plan-assign-stepper__track">
                <span className="fee-plan-assign-stepper__index">{isDone ? '✓' : index + 1}</span>
                {!isLast ? <span className="fee-plan-assign-stepper__line" aria-hidden="true" /> : null}
              </span>
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

export function feePlanLevelLabel(
  plan: FeePlan,
  scopeGroups: FeePlanScopeCycleGroup[],
  scopeLabels: ReturnType<typeof useFeePlanScopeLabels>,
) {
  return feePlanLevelScopeLabel(plan, scopeGroups, scopeLabels);
}
