import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildLinePayload,
  findDuplicateLineScope,
  validateFeePlanForm,
} from '@/features/admin/finance/fee-plans/fee-plan-payload';
import {
  createEmptyFeePlanFormValues,
  newDraftLine,
  type FeePlanFormValues,
} from '@/features/admin/finance/fee-plans/fee-plan-types';
import { buildFeeTypeUpdatePayload, feeTypeFormValuesFromDetail, normalizeFeeTypeDetail } from '@/features/admin/finance/fee-types/normalize-fee-type';

function sampleForm(overrides?: Partial<FeePlanFormValues>): FeePlanFormValues {
  const line = newDraftLine('line-1');
  line.feeTypeId = 5;
  line.amount = 1000;
  line.label = 'Tuition';
  return {
    ...createEmptyFeePlanFormValues(),
    name: 'Plan QA',
    code: 'PLAN-QA',
    academicYearId: '1',
    levelIds: [77],
    lines: [line],
    ...overrides,
  };
}

describe('unified fee catalog pricing — fee type forms', () => {
  it('create form source does not expose default_amount field', () => {
    const source = readFileSync('src/features/admin/finance/fee-type-form.tsx', 'utf8');
    expect(source).not.toContain('defaultAmount');
    expect(source).not.toContain('default_amount');
    expect(source).not.toContain('currency_id');
    expect(source).not.toContain('isMandatory');
  });

  it('edit drawer source does not expose deprecated pricing fields', () => {
    const source = readFileSync('src/features/admin/finance/fee-types/fee-type-edit-drawer.tsx', 'utf8');
    expect(source).not.toContain('defaultAmount');
    expect(source).not.toContain('default_amount');
    expect(source).not.toContain('currencyId');
    expect(source).not.toContain('frequency');
    expect(source).not.toContain('isMandatory');
  });

  it('update payload never sends default_amount', () => {
    const detail = normalizeFeeTypeDetail({
      id: 1,
      name: 'Tuition',
      code: 'TUI',
      category: 'tuition',
      default_amount: 999,
      frequency: 'monthly',
      is_mandatory: true,
      active: true,
      school_id: 3,
      allowed_actions: ['edit'],
    })!;
    const payload = buildFeeTypeUpdatePayload(detail, {
      ...feeTypeFormValuesFromDetail(detail),
      name: 'Tuition updated',
    });
    expect(payload.default_amount).toBeUndefined();
    expect(payload.frequency).toBeUndefined();
    expect(payload.is_mandatory).toBeUndefined();
    expect(payload.currency_id).toBeUndefined();
  });
});

describe('unified fee catalog pricing — fee plan lines', () => {
  it('builds line payload with amount frequency and level_ids', () => {
    const line = newDraftLine('x');
    line.feeTypeId = 10;
    line.amount = 1000;
    line.frequency = 'monthly';
    line.levelScopeMode = 'specific';
    line.levelIds = [77, 88];

    const payload = buildLinePayload(line);
    expect(payload.amount).toBe(1000);
    expect(payload.frequency).toBe('monthly');
    expect(payload.level_ids).toEqual([77, 88]);
    expect(payload.is_optional).toBe(false);
    expect(payload).not.toHaveProperty('is_mandatory');
  });

  it('allows same fee type with different level scopes', () => {
    const a = newDraftLine('a');
    a.feeTypeId = 1;
    a.amount = 1000;
    a.levelScopeMode = 'specific';
    a.levelIds = [77];
    const b = newDraftLine('b');
    b.feeTypeId = 1;
    b.amount = 1100;
    b.levelScopeMode = 'specific';
    b.levelIds = [88];

    expect(validateFeePlanForm(sampleForm({ lines: [a, b] }), { requireLevel: true })).toBeNull();
  });

  it('warns on duplicate fee type and level scope', () => {
    const a = newDraftLine('a');
    a.feeTypeId = 1;
    a.amount = 1000;
    a.levelScopeMode = 'all_plan_levels';
    const b = newDraftLine('b');
    b.feeTypeId = 1;
    b.amount = 1100;
    b.levelScopeMode = 'all_plan_levels';

    expect(findDuplicateLineScope([a, b])).toBe(b);
    const error = validateFeePlanForm(sampleForm({ lines: [a, b] }), { requireLevel: true });
    expect(error?.messageKey).toBe('admin.finance.feePlansWorkspace.errors.duplicateLineScope');
  });

  it('rejects negative line amount', () => {
    const line = newDraftLine('x');
    line.feeTypeId = 1;
    line.amount = -5;
    const error = validateFeePlanForm(sampleForm({ lines: [line] }), { requireLevel: true });
    expect(error?.messageKey).toBe('admin.finance.feePlansWorkspace.errors.lineAmountRequired');
  });

  it('does not read default_amount from fee type for line pricing', () => {
    const editorSource = readFileSync('src/features/admin/finance/fee-plans/fee-plan-lines-editor.tsx', 'utf8');
    const dialogSource = readFileSync('src/features/admin/finance/fee-plans/fee-plan-line-dialog.tsx', 'utf8');
    expect(editorSource).not.toContain('default_amount');
    expect(dialogSource).not.toContain('default_amount');
  });
});

describe('unified fee catalog pricing — navigation', () => {
  it('fee-types route redirects to fee-plans catalog', async () => {
    const source = readFileSync('src/app/admin/finance/fee-types/page.tsx', 'utf8');
    expect(source).toContain('/admin/finance/fee-plans?catalog=open');
    expect(source).not.toContain('FeeTypesPage');
  });

  it('finance hub no longer links fee-types workspace', () => {
    const source = readFileSync('src/features/admin/finance/finance-hub-links.tsx', 'utf8');
    expect(source).not.toContain('hubFeeTypes');
    expect(source).not.toContain('/admin/finance/fee-types');
  });

  it('fee plans page opens catalog drawer from query param', () => {
    const source = readFileSync('src/features/admin/finance/fee-plans/fee-plans-page.tsx', 'utf8');
    expect(source).toContain('FeeTypesCatalogDrawer');
    expect(source).toContain("catalog') === 'open'");
    expect(source).toContain('onManageCatalog');
  });
});
