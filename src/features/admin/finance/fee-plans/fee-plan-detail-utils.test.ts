import { describe, expect, it } from 'vitest';
import {
  buildFeePlanLineDisplay,
  computeFeePlanFinancialSummary,
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
      sampleLine({
        amount: 2000,
        frequency: 'monthly',
        installment_count: 10,
        pricing_mode: 'recurring_unit_price',
        expected_total: 20000,
        installment_amount: 2000,
      }),
      sampleLine({
        id: 2,
        amount: 2500,
        frequency: 'one_time',
        pricing_mode: 'total_amount_installments',
        expected_total: 2500,
      }),
    ]);
    expect(withPeriods.annualEstimate).toBe(22500);

    const singleMonth = computeFeePlanFinancialSummary([
      sampleLine({ amount: 2000, frequency: 'monthly', installment_count: 1 }),
    ]);
    expect(singleMonth.annualEstimate).toBeNull();
  });

  it('tracks monthly installment count separately from one-time lines', () => {
    const summary = computeFeePlanFinancialSummary([
      sampleLine({ amount: 2000, frequency: 'monthly', installment_count: 10 }),
      sampleLine({ id: 2, amount: 2500, frequency: 'one_time', installment_count: 3 }),
    ]);
    expect(summary.maxMonthlyInstallmentCount).toBe(10);
    expect(summary.maxInstallmentCount).toBe(10);
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

  it('shows all plan levels when level_ids empty', () => {
    const display = buildFeePlanLineDisplay(sampleLine({ level_ids: [] }), samplePlan(), scopeGroups);
    expect(display.scopeLabelKey).toBe('allPlanLevels');
  });

  it('warns on monthly recurring with single installment', () => {
    const display = buildFeePlanLineDisplay(
      sampleLine({
        frequency: 'monthly',
        installment_count: 1,
        pricing_mode: 'recurring_unit_price',
      }),
      samplePlan(),
      scopeGroups,
    );
    expect(display.warnings).toContain('monthlySingleInstallment');
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
