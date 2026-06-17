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
}: {
  plan: FeePlan;
  yearLabel: string;
  levelLabel: string;
}) {
  const t = useT();
  const lineCount = plan.lines?.length ?? 0;

  return (
    <section className="card fee-plan-assign-source" data-testid="fee-plan-assign-source">
      <h2 className="fee-plan-assign-source__title">{t('admin.finance.assignFlow.sourcePlan')}</h2>
      <dl className="detail-list fee-plan-assign-source__grid">
        <div>
          <dt>{t('admin.finance.planName')}</dt>
          <dd>
            <strong>{plan.name}</strong>
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.academicYear')}</dt>
          <dd>{yearLabel}</dd>
        </div>
        <div>
          <dt>{t('nav.levels')}</dt>
          <dd>{levelLabel}</dd>
        </div>
        <div>
          <dt>{t('academic.status')}</dt>
          <dd>
            <FinanceStatusBadge state={feePlanState(plan)} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.finance.feePlansWorkspace.lineCount')}</dt>
          <dd>{lineCount}</dd>
        </div>
        <div>
          <dt>{t('admin.finance.currency')}</dt>
          <dd>{plan.currency ?? t('common.dash')}</dd>
        </div>
      </dl>
      <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost btn--sm">
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
      <ol>
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
