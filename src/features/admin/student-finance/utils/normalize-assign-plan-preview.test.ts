import { describe, expect, it } from 'vitest';
import type { ApiResponse } from '@/types/api';
import {
  classifyAssignPlanPreview,
  normalizeAssignPlanPreview,
} from './normalize-assign-plan-preview';

function ok(data: unknown): ApiResponse<unknown> {
  return { success: true, data, meta: {} };
}

function err(
  code: string,
  message?: string,
  details?: Record<string, unknown>,
): ApiResponse<unknown> {
  return {
    success: false,
    error: { code, message: message ?? code, details: details ?? {} },
    meta: {},
  };
}

describe('normalizeAssignPlanPreview', () => {
  it('reads plan name, year, level, total, currency and installment count', () => {
    const plan = normalizeAssignPlanPreview({
      fee_plan_id: 42,
      fee_plan_name: 'Plan A',
      academic_year: { id: 7, name: '2026/2027' },
      level: { id: 3, name: 'CE1' },
      total: 12000,
      currency: { name: 'MAD', symbol: 'DH' },
      installment_count: 10,
      allowed_actions: { customize_plan: true, skip_finance: false },
      can_assign: true,
    });

    expect(plan.feePlanId).toBe(42);
    expect(plan.planName).toBe('Plan A');
    expect(plan.academicYearId).toBe(7);
    expect(plan.academicYearName).toBe('2026/2027');
    expect(plan.levelName).toBe('CE1');
    expect(plan.total).toBe(12000);
    expect(plan.currency?.symbol).toBe('DH');
    expect(plan.installmentCount).toBe(10);
    expect(plan.allowedActions).toEqual(['customize_plan']);
    expect(plan.canAssign).toBe(true);
  });

  it('falls back to nested plan/summary fields and derives installments from periods', () => {
    const plan = normalizeAssignPlanPreview({
      plan: { id: 9, name: 'Nested' },
      financial_summary: { expected_total: 5000, currency: 'MAD' },
      suggested_periods: [{ period_key: '2026-09' }, { period_key: '2026-10' }],
    });
    expect(plan.feePlanId).toBe(9);
    expect(plan.planName).toBe('Nested');
    expect(plan.total).toBe(5000);
    expect(plan.installmentCount).toBe(2);
  });
});

describe('classifyAssignPlanPreview', () => {
  it('returns ready for an assignable preview body', () => {
    const state = classifyAssignPlanPreview(
      ok({ fee_plan_id: 1, fee_plan_name: 'X', can_assign: true, total: 100 }),
    );
    expect(state.kind).toBe('ready');
    if (state.kind === 'ready') {
      expect(state.plan.feePlanId).toBe(1);
    }
  });

  it('detects active agreement via success flag', () => {
    expect(
      classifyAssignPlanPreview(ok({ active_agreement_exists: true })).kind,
    ).toBe('active_agreement_exists');
  });

  it('detects active agreement via can_assign=false + blocking_reason', () => {
    expect(
      classifyAssignPlanPreview(
        ok({ can_assign: false, blocking_reason: 'active_agreement_exists' }),
      ).kind,
    ).toBe('active_agreement_exists');
  });

  it('detects active agreement via error envelope', () => {
    expect(classifyAssignPlanPreview(err('active_agreement_exists')).kind).toBe(
      'active_agreement_exists',
    );
  });

  it('detects missing academic enrollment', () => {
    expect(classifyAssignPlanPreview(err('missing_academic_enrollment')).kind).toBe(
      'missing_academic_enrollment',
    );
    expect(
      classifyAssignPlanPreview(ok({ can_assign: false, blocking_reason: 'missing_academic_enrollment' }))
        .kind,
    ).toBe('missing_academic_enrollment');
  });

  it('treats no_eligible_fee_plan_for_level as no eligible plan', () => {
    expect(classifyAssignPlanPreview(err('no_eligible_fee_plan_for_level')).kind).toBe(
      'no_eligible_plan',
    );
  });

  it('surfaces selectable candidates for no_default_fee_plan_for_level', () => {
    const state = classifyAssignPlanPreview(
      err('no_default_fee_plan_for_level', 'pick one', {
        selectable_candidate_plans: [
          { id: 11, name: 'Cand A', reason_not_selected: 'not_default' },
        ],
      }),
    );
    expect(state.kind).toBe('candidate_selection');
    if (state.kind === 'candidate_selection') {
      expect(state.candidates).toHaveLength(1);
      expect(state.candidates[0].id).toBe(11);
    }
  });

  it('falls back to no_eligible_plan when no_default has no selectable candidates', () => {
    const state = classifyAssignPlanPreview(
      err('no_default_fee_plan_for_level', 'none', {
        diagnostics: { matching_level_plans: 0 },
      }),
    );
    expect(state.kind).toBe('no_eligible_plan');
  });

  it('returns error with message for unknown failures', () => {
    const state = classifyAssignPlanPreview(err('server_error', 'boom'));
    expect(state.kind).toBe('error');
    if (state.kind === 'error') expect(state.message).toBe('boom');
  });
});
