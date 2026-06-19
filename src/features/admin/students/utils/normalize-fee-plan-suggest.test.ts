import { describe, expect, it } from 'vitest';
import {
  normalizeFeePlanSuggestResponse,
  resolveFeePlanSuggestErrorCode,
} from './normalize-fee-plan-suggest';

describe('normalizeFeePlanSuggestResponse', () => {
  it('normalizes ok=true plan with included and excluded months', () => {
    const result = normalizeFeePlanSuggestResponse({
      ok: true,
      plan: { id: 2896, name: 'QA Billing Calendar Suggest', level_id: 77, academic_year_id: 1 },
      billing_calendar: { start_date: '2026-09-01', end_date: '2027-06-30', default_due_day: 5 },
      suggested_periods: [
        { period_key: '2026-12', label: 'دجنبر 2026', due_date: '2026-12-05' },
      ],
      excluded_periods: [{ period_key: '2026-09', label: 'شتنبر 2026' }],
      allowed_actions: { customize_plan: true },
    });

    expect(result?.fee_plan_id).toBe(2896);
    expect(result?.fee_plan_name).toBe('QA Billing Calendar Suggest');
    expect(result?.performance_start).toBe('2026-09-01');
    expect(result?.performance_end).toBe('2027-06-30');
    expect(result?.due_day).toBe(5);
    expect(result?.suggested_periods).toHaveLength(1);
    expect(result?.excluded_periods).toHaveLength(1);
  });
});

describe('resolveFeePlanSuggestErrorCode', () => {
  it('reads no_default_fee_plan_for_level', () => {
    expect(
      resolveFeePlanSuggestErrorCode({
        ok: false,
        error: { code: 'no_default_fee_plan_for_level' },
      }),
    ).toBe('no_default_fee_plan_for_level');
  });
});
