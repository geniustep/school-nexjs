import { describe, expect, it } from 'vitest';
import { buildAssignPlanBody } from './assign-plan-api';

describe('buildAssignPlanBody', () => {
  it('builds the minimal draft body for this phase', () => {
    const body = buildAssignPlanBody({ feePlanId: 5, academicYearId: 9 });
    expect(body).toEqual({
      fee_plan_id: 5,
      academic_year_id: 9,
      activation_mode: 'draft',
      customize_plan: false,
      discounts: [],
      selected_optional_line_ids: [],
    });
  });

  it('omits academic_year_id when not available', () => {
    const body = buildAssignPlanBody({ feePlanId: 5, academicYearId: null });
    expect(body).not.toHaveProperty('academic_year_id');
    expect(body.fee_plan_id).toBe(5);
    expect(body.activation_mode).toBe('draft');
    expect(body.customize_plan).toBe(false);
    expect(body.discounts).toEqual([]);
    expect(body.selected_optional_line_ids).toEqual([]);
  });
});
