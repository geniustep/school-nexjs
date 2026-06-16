import { describe, expect, it } from 'vitest';
import {
  buildCreateFeePlanPayload,
  buildLinePayload,
  buildUpdateFeePlanPayload,
  findDuplicateLineScope,
  validateFeePlanForm,
} from '@/features/admin/finance/fee-plans/fee-plan-payload';
import { formValuesFromFeePlan } from '@/features/admin/finance/fee-plans/fee-plan-normalizer';
import {
  createEmptyFeePlanFormValues,
  newDraftLine,
  type FeePlanFormValues,
} from '@/features/admin/finance/fee-plans/fee-plan-types';
import type { FeePlan, FeeType } from '@/types/finance';

const LEVEL_A = 77;
const LEVEL_B = 88;
const TYPE_TUITION = 10;
const TYPE_REG = 11;
const TYPE_TRANSPORT = 12;

function arabicPlanForm(overrides?: Partial<FeePlanFormValues>): FeePlanFormValues {
  const line1 = newDraftLine('l1');
  line1.feeTypeId = TYPE_TUITION;
  line1.label = 'التمدرس التجريبي — المستوى الأول';
  line1.amount = 1000;
  line1.frequency = 'monthly';
  line1.levelScopeMode = 'specific';
  line1.levelIds = [LEVEL_A];

  const line2 = newDraftLine('l2');
  line2.feeTypeId = TYPE_TUITION;
  line2.label = 'التمدرس التجريبي — المستوى الثاني';
  line2.amount = 1100;
  line2.frequency = 'monthly';
  line2.levelScopeMode = 'specific';
  line2.levelIds = [LEVEL_B];

  const line3 = newDraftLine('l3');
  line3.feeTypeId = TYPE_REG;
  line3.label = 'التسجيل التجريبي';
  line3.amount = 1500;
  line3.frequency = 'once';
  line3.levelScopeMode = 'all_plan_levels';

  const line4 = newDraftLine('l4');
  line4.feeTypeId = TYPE_TRANSPORT;
  line4.label = 'النقل التجريبي';
  line4.amount = 350;
  line4.frequency = 'monthly';
  line4.isOptional = true;
  line4.levelScopeMode = 'all_plan_levels';

  return {
    ...createEmptyFeePlanFormValues(),
    name: 'خطة الرسوم التجريبية متعددة المستويات 2026-2027',
    code: 'QA-PLAN-AR-2027',
    academicYearId: '1',
    levelIds: [LEVEL_A, LEVEL_B],
    lines: [line1, line2, line3, line4],
    ...overrides,
  };
}

describe('fee plan end-to-end pricing workflow', () => {
  it('builds create payload with four Arabic lines and no default_amount', () => {
    const payload = buildCreateFeePlanPayload(arabicPlanForm(), 3, []);
    expect(payload.lines).toHaveLength(4);
    expect(payload.lines?.[0]).toMatchObject({
      fee_type_id: TYPE_TUITION,
      amount: 1000,
      frequency: 'monthly',
      level_ids: [LEVEL_A],
      is_optional: false,
    });
    expect(payload.lines?.[1]).toMatchObject({
      fee_type_id: TYPE_TUITION,
      amount: 1100,
      level_ids: [LEVEL_B],
    });
    expect(payload.lines?.[2]).toMatchObject({
      fee_type_id: TYPE_REG,
      amount: 1500,
      frequency: 'one_time',
    });
    expect(payload.lines?.[2].level_ids).toBeUndefined();
    expect(payload.lines?.[3]).toMatchObject({
      fee_type_id: TYPE_TRANSPORT,
      amount: 350,
      is_optional: true,
    });
    expect(JSON.stringify(payload)).not.toContain('default_amount');
  });

  it('allows same fee type with different level prices', () => {
    const form = arabicPlanForm();
    expect(validateFeePlanForm(form, { requireLevel: true })).toBeNull();
    expect(form.lines[0].feeTypeId).toBe(form.lines[1].feeTypeId);
    expect(form.lines[0].amount).not.toBe(form.lines[1].amount);
  });

  it('detects duplicate line scope before submit', () => {
    const dup = newDraftLine('dup');
    dup.feeTypeId = TYPE_TUITION;
    dup.amount = 1000;
    dup.frequency = 'monthly';
    dup.levelScopeMode = 'specific';
    dup.levelIds = [LEVEL_A];
    const form = arabicPlanForm({ lines: [...arabicPlanForm().lines, dup] });
    expect(findDuplicateLineScope(form.lines)?.clientId).toBe('dup');
    expect(validateFeePlanForm(form, { requireLevel: true })?.messageKey).toBe(
      'admin.finance.feePlansWorkspace.errors.duplicateLineScope',
    );
  });

  it('maps mandatory and optional without sending both flags', () => {
    const required = buildLinePayload(arabicPlanForm().lines[0]);
    const optional = buildLinePayload(arabicPlanForm().lines[3]);
    expect(required.is_optional).toBe(false);
    expect(optional.is_optional).toBe(true);
    expect(required).not.toHaveProperty('is_mandatory');
    expect(optional).not.toHaveProperty('is_mandatory');
  });

  it('round-trips plan lines through normalizer preserving amounts and scopes', () => {
    const apiPlan = {
      id: 99,
      code: 'QA-PLAN-AR-2027',
      name: 'خطة الرسوم التجريبية متعددة المستويات 2026-2027',
      school_id: 3,
      academic_year_id: 1,
      level_ids: [LEVEL_A, LEVEL_B],
      lines: [
        {
          id: 1,
          fee_type_id: TYPE_TUITION,
          amount: 1150,
          frequency: 'monthly',
          level_ids: [LEVEL_B],
          is_optional: false,
        },
        {
          id: 2,
          fee_type_id: TYPE_REG,
          amount: 1500,
          frequency: 'one_time',
          is_optional: false,
        },
      ],
    } as FeePlan;
    const feeTypes: FeeType[] = [
      { id: TYPE_TUITION, code: 'TUI', name: 'التمدرس التجريبي', school_id: 3 },
      { id: TYPE_REG, code: 'REG', name: 'التسجيل التجريبي', school_id: 3 },
    ];
    const values = formValuesFromFeePlan(apiPlan, feeTypes);
    expect(values.lines[0].amount).toBe(1150);
    expect(values.lines[0].levelIds).toEqual([LEVEL_B]);
    expect(values.lines[0].frequency).toBe('monthly');
    expect(values.lines[1].levelScopeMode).toBe('all_plan_levels');
    expect(values.lines[1].amount).toBe(1500);
    expect(values.lines[1].frequency).toBe('once');
  });

  it('maps once to one_time for API and back for forms', async () => {
    const { feePlanFrequencyFromApi, feePlanFrequencyToApi } = await import(
      '@/features/admin/finance/fee-plans/fee-plan-frequency'
    );
    expect(feePlanFrequencyToApi('once')).toBe('one_time');
    expect(feePlanFrequencyFromApi('one_time')).toBe('once');
    expect(feePlanFrequencyToApi('monthly')).toBe('monthly');
  });

  it('update payload changes one line amount only', () => {
    const form = arabicPlanForm();
    form.lines[1].amount = 1150;
    const payload = buildUpdateFeePlanPayload(form, []);
    expect(payload.lines?.[0].amount).toBe(1000);
    expect(payload.lines?.[1].amount).toBe(1150);
    expect(payload.lines?.[2].amount).toBe(1500);
    expect(payload.lines?.[3].amount).toBe(350);
  });

  it('rejects negative line amount', () => {
    const form = arabicPlanForm();
    form.lines[0].amount = -1;
    expect(validateFeePlanForm(form, { requireLevel: true })?.messageKey).toBe(
      'admin.finance.feePlansWorkspace.errors.lineAmountRequired',
    );
  });
});

describe('fee plan redirect contract', () => {
  it('fee-types page redirects to catalog query', async () => {
    const fs = await import('node:fs/promises');
    const text = await fs.readFile('src/app/admin/finance/fee-types/page.tsx', 'utf8');
    expect(text).toContain('/admin/finance/fee-plans?catalog=open');
  });
});
