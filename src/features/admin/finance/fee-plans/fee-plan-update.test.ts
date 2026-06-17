import { describe, expect, it } from 'vitest';
import { feePlanErrorMessageKey } from '@/features/admin/finance/fee-plans/fee-plan-errors';
import {
  buildLinePayload,
  buildUpdateFeePlanPayload,
  validateFeePlanForm,
} from '@/features/admin/finance/fee-plans/fee-plan-payload';
import { formValuesFromFeePlan } from '@/features/admin/finance/fee-plans/fee-plan-normalizer';
import { newDraftLine, type FeePlanFormValues } from '@/features/admin/finance/fee-plans/fee-plan-types';
import type { FeePlan, FeeType } from '@/types/finance';

const LEVEL_A = 77;
const LEVEL_B = 88;
const LINE_ID_1 = 501;
const LINE_ID_2 = 502;
const LINE_ID_3 = 503;
const LINE_ID_4 = 504;
const TYPE_TUI = 10;
const TYPE_REG = 11;
const TYPE_TRN = 12;

function loadedPlanForm(): FeePlanFormValues {
  const apiPlan = {
    id: 99,
    code: 'QA-UPDATE-PLAN',
    name: 'خطة اختبار تحديث أسعار الرسوم متعددة المستويات 2026-2027',
    school_id: 3,
    academic_year_id: 1,
    level_ids: [LEVEL_A, LEVEL_B],
    lines: [
      {
        id: LINE_ID_1,
        fee_type_id: TYPE_TUI,
        amount: 1000,
        frequency: 'monthly',
        level_ids: [LEVEL_A],
        is_optional: false,
      },
      {
        id: LINE_ID_2,
        fee_type_id: TYPE_TUI,
        amount: 1100,
        frequency: 'monthly',
        level_ids: [LEVEL_B],
        is_optional: false,
      },
      {
        id: LINE_ID_3,
        fee_type_id: TYPE_REG,
        amount: 1500,
        frequency: 'one_time',
        is_optional: false,
      },
      {
        id: LINE_ID_4,
        fee_type_id: TYPE_TRN,
        amount: 350,
        frequency: 'monthly',
        is_optional: true,
      },
    ],
  } as FeePlan;
  const feeTypes: FeeType[] = [
    { id: TYPE_TUI, code: 'TUI', name: 'التمدرس التجريبي', school_id: 3 },
    { id: TYPE_REG, code: 'REG', name: 'التسجيل التجريبي', school_id: 3 },
    { id: TYPE_TRN, code: 'TRN', name: 'النقل التجريبي', school_id: 3 },
  ];
  return formValuesFromFeePlan(apiPlan, feeTypes);
}

describe('fee plan line update payload', () => {
  it('preserves lineId when loading plan for edit', () => {
    const form = loadedPlanForm();
    expect(form.lines[0].lineId).toBe(LINE_ID_1);
    expect(form.lines[1].lineId).toBe(LINE_ID_2);
    expect(form.lines[3].isOptional).toBe(true);
  });

  it('sends line.id on PUT for existing rows only', () => {
    const form = loadedPlanForm();
    form.lines[1].amount = 1150;
    const payload = buildUpdateFeePlanPayload(form, []);
    expect(payload.lines).toHaveLength(4);
    expect(payload.lines?.[0]).toMatchObject({ id: LINE_ID_1, amount: 1000 });
    expect(payload.lines?.[1]).toMatchObject({ id: LINE_ID_2, amount: 1150 });
    expect(payload.lines?.[2]).toMatchObject({ id: LINE_ID_3, amount: 1500 });
    expect(payload.lines?.[3]).toMatchObject({ id: LINE_ID_4, amount: 350, is_optional: true });
  });

  it('omits id for newly added lines', () => {
    const form = loadedPlanForm();
    const extra = newDraftLine('new-activity');
    extra.feeTypeId = 99;
    extra.amount = 200;
    extra.frequency = 'once';
    extra.isOptional = true;
    extra.levelScopeMode = 'all_plan_levels';
    form.lines.push(extra);
    const payload = buildUpdateFeePlanPayload(form, []);
    const last = payload.lines?.[payload.lines.length - 1];
    expect(last?.id).toBeUndefined();
    expect(last).toMatchObject({ amount: 200, frequency: 'one_time', level_ids: [], is_optional: true });
  });

  it('excludes deleted lines from full PUT list', () => {
    const form = loadedPlanForm();
    form.lines = form.lines.filter((l) => l.lineId !== LINE_ID_4);
    const payload = buildUpdateFeePlanPayload(form, []);
    expect(payload.lines).toHaveLength(3);
    expect(payload.lines?.some((l) => l.id === LINE_ID_4)).toBe(false);
  });

  it('keeps frequency and level_ids when updating amount only', () => {
    const form = loadedPlanForm();
    form.lines[1].amount = 1150;
    const line = buildLinePayload(form.lines[1]);
    expect(line).toMatchObject({
      id: LINE_ID_2,
      amount: 1150,
      frequency: 'monthly',
      level_ids: [LEVEL_B],
      is_optional: false,
    });
  });

  it('maps all-plan-levels to empty level_ids array', () => {
    const form = loadedPlanForm();
    const regLine = buildLinePayload(form.lines[2]);
    expect(regLine.level_ids).toEqual([]);
  });

  it('does not revert normalized amount after edit round-trip', () => {
    const form = loadedPlanForm();
    form.lines[1].amount = 1150;
    const payload = buildUpdateFeePlanPayload(form, []);
    const roundTrip = {
      ...({
        id: 99,
        code: form.code,
        name: form.name,
        school_id: 3,
        academic_year_id: 1,
      } as FeePlan),
      lines: payload.lines!.map((l, i) => ({
        id: l.id ?? i,
        fee_type_id: l.fee_type_id,
        amount: l.amount,
        frequency: l.frequency,
        level_ids: l.level_ids,
        is_optional: l.is_optional,
      })),
    };
    const feeTypes: FeeType[] = [
      { id: TYPE_TUI, code: 'TUI', name: 'التمدرس', school_id: 3 },
      { id: TYPE_REG, code: 'REG', name: 'التسجيل', school_id: 3 },
      { id: TYPE_TRN, code: 'TRN', name: 'النقل', school_id: 3 },
    ];
    const values = formValuesFromFeePlan(roundTrip, feeTypes);
    expect(values.lines[1].amount).toBe(1150);
    expect(values.lines[0].amount).toBe(1000);
  });

  it('maps fee_plan_duplicate_line to Arabic message key', () => {
    expect(feePlanErrorMessageKey('fee_plan_duplicate_line')).toBe(
      'admin.finance.feePlansWorkspace.errors.duplicateLineScope',
    );
  });

  it('rejects duplicate scope locally before submit', () => {
    const form = loadedPlanForm();
    const dup = newDraftLine('dup');
    dup.feeTypeId = TYPE_TUI;
    dup.amount = 999;
    dup.frequency = 'monthly';
    dup.levelScopeMode = 'specific';
    dup.levelIds = [LEVEL_A];
    form.lines.push(dup);
    expect(validateFeePlanForm(form, { requireLevel: true })?.messageKey).toBe(
      'admin.finance.feePlansWorkspace.errors.duplicateLineScope',
    );
  });

  it('update payload excludes default_amount', () => {
    const form = loadedPlanForm();
    form.lines[1].amount = 1150;
    expect(JSON.stringify(buildUpdateFeePlanPayload(form, []))).not.toContain('default_amount');
  });
});

describe('fee plan drawer reload contract', () => {
  it('reloads plan detail after successful PUT', async () => {
    const fs = await import('node:fs/promises');
    const text = await fs.readFile('src/features/admin/finance/fee-plans/fee-plan-drawer.tsx', 'utf8');
    expect(text).toContain('planState.reload()');
    expect(text).toContain('feePlanErrorMessageKey');
  });
});
