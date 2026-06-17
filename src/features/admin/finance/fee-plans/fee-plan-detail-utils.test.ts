import { describe, expect, it } from 'vitest';
import {
  buildFeePlanLineDisplay,
  computeFeePlanFinancialSummary,
  feePlanAllowedActions,
  feePlanAllowsAction,
  feePlanUsageSummary,
  resolveLineScopeNames,
} from '@/features/admin/finance/fee-plans/fee-plan-detail-utils';
import type { FeePlanScopeCycleGroup } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import type { FeePlan, FeePlanLine } from '@/types/finance';

function sampleLine(overrides: Partial<FeePlanLine> = {}): FeePlanLine {
  return {
    id: 1,
    amount: 2000,
    frequency: 'monthly',
    installment_count: 10,
    is_optional: false,
    fee_type_name: 'Tuition',
    ...overrides,
  };
}

function samplePlan(overrides: Partial<FeePlan> = {}): FeePlan {
  return {
    id: 1,
    code: 'PLAN-1',
    name: 'Primary plan 2025-2026',
    school_id: 1,
    state: 'draft',
    level_ids: [1, 2],
    lines: [sampleLine()],
    ...overrides,
  };
}

describe('feePlanAllowedActions', () => {
  it('uses API allowed_actions when provided', () => {
    const plan = samplePlan({ allowed_actions: ['view', 'edit', 'confirm'] });
    expect(feePlanAllowedActions(plan)).toEqual(['view', 'edit', 'confirm']);
  });

  it('falls back to draft actions', () => {
    const plan = samplePlan({ state: 'draft' });
    expect(feePlanAllowsAction(plan, 'edit')).toBe(true);
    expect(feePlanAllowsAction(plan, 'assign')).toBe(false);
  });

  it('falls back to confirmed actions', () => {
    const plan = samplePlan({ state: 'confirmed' });
    expect(feePlanAllowsAction(plan, 'assign')).toBe(true);
    expect(feePlanAllowsAction(plan, 'edit')).toBe(false);
  });

  it('falls back to archived actions', () => {
    const plan = samplePlan({ state: 'archived' });
    expect(feePlanAllowsAction(plan, 'restore')).toBe(true);
    expect(feePlanAllowsAction(plan, 'edit')).toBe(false);
  });
});

describe('computeFeePlanFinancialSummary', () => {
  it('separates monthly and one-time totals', () => {
    const summary = computeFeePlanFinancialSummary([
      sampleLine({ amount: 2000, frequency: 'monthly', installment_count: 10 }),
      sampleLine({ id: 2, amount: 2500, frequency: 'one_time', installment_count: 1 }),
    ]);
    expect(summary.monthlyRequiredTotal).toBe(2000);
    expect(summary.oneTimeRequiredTotal).toBe(2500);
  });

  it('computes annual estimate only when installment_count > 1', () => {
    const withPeriods = computeFeePlanFinancialSummary([
      sampleLine({ amount: 2000, frequency: 'monthly', installment_count: 10 }),
      sampleLine({ id: 2, amount: 2500, frequency: 'one_time' }),
    ]);
    expect(withPeriods.annualEstimate).toBe(22500);

    const singleMonth = computeFeePlanFinancialSummary([
      sampleLine({ amount: 2000, frequency: 'monthly', installment_count: 1 }),
    ]);
    expect(singleMonth.annualEstimate).toBeNull();
  });

  it('does not treat monthly amount as misleading total', () => {
    const summary = computeFeePlanFinancialSummary([
      sampleLine({ amount: 2000, frequency: 'monthly', installment_count: 1 }),
    ]);
    expect(summary.monthlyRequiredTotal).toBe(2000);
    expect(summary.annualEstimate).toBeNull();
  });
});

describe('buildFeePlanLineDisplay', () => {
  const scopeGroups: FeePlanScopeCycleGroup[] = [
    {
      cycle: { id: 1, code: 'primary', name: 'Primary', sequence: 1 },
      levels: [
        { schoolLevelId: 1, name: 'CP', code: 'CP', sequence: 1 },
        { schoolLevelId: 2, name: 'CE1', code: 'CE1', sequence: 2 },
      ],
    },
  ];

  it('translates frequency via UI key once/monthly', () => {
    const monthly = buildFeePlanLineDisplay(sampleLine({ frequency: 'monthly' }), samplePlan(), scopeGroups);
    expect(monthly.frequencyUi).toBe('monthly');

    const once = buildFeePlanLineDisplay(
      sampleLine({ frequency: 'one_time' }),
      samplePlan(),
      scopeGroups,
    );
    expect(once.frequencyUi).toBe('once');
  });

  it('shows all plan levels when level_ids empty', () => {
    const display = buildFeePlanLineDisplay(sampleLine({ level_ids: [] }), samplePlan(), scopeGroups);
    expect(display.scopeLabelKey).toBe('allPlanLevels');
  });

  it('shows specific level names', () => {
    const display = buildFeePlanLineDisplay(
      sampleLine({ level_ids: [1] }),
      samplePlan(),
      scopeGroups,
    );
    expect(display.scopeLabelKey).toBe('specificLevels');
    expect(display.scopeNames).toEqual(['CP']);
  });

  it('maps optional flag correctly', () => {
    const required = buildFeePlanLineDisplay(sampleLine({ is_optional: false }), samplePlan(), scopeGroups);
    const optional = buildFeePlanLineDisplay(sampleLine({ is_optional: true }), samplePlan(), scopeGroups);
    expect(required.isOptional).toBe(false);
    expect(optional.isOptional).toBe(true);
  });

  it('warns on monthly with single installment', () => {
    const display = buildFeePlanLineDisplay(
      sampleLine({ frequency: 'monthly', installment_count: 1 }),
      samplePlan(),
      scopeGroups,
    );
    expect(display.warnings).toContain('monthlySingleInstallment');
  });

  it('warns on optional tuition', () => {
    const display = buildFeePlanLineDisplay(
      sampleLine({
        is_optional: true,
        fee_type: { id: 1, code: 'TUITION', name: 'Tuition', category: 'tuition' },
      }),
      samplePlan(),
      scopeGroups,
    );
    expect(display.warnings).toContain('tuitionOptional');
  });
});

describe('resolveLineScopeNames', () => {
  const scopeGroups: FeePlanScopeCycleGroup[] = [
    {
      cycle: { id: 1, code: 'primary', name: 'Primary', sequence: 1 },
      levels: [{ schoolLevelId: 3, name: 'CM2', code: 'CM2', sequence: 6 }],
    },
  ];

  it('returns allPlanLevels for empty level_ids', () => {
    expect(resolveLineScopeNames(sampleLine({ level_ids: [] }), [3], scopeGroups).mode).toBe(
      'allPlanLevels',
    );
  });
});

describe('feePlanUsageSummary', () => {
  it('returns usage when API provides it', () => {
    const plan = samplePlan({ usage: { student_count: 12, agreement_count: 8 } });
    expect(feePlanUsageSummary(plan)).toEqual({ student_count: 12, agreement_count: 8 });
  });

  it('returns null when usage missing', () => {
    expect(feePlanUsageSummary(samplePlan())).toBeNull();
  });
});
