import { describe, expect, it } from 'vitest';
import { buildConfirmedFeePlansQuery } from '@/features/admin/finance/fee-plan-assign-query';
import {
  buildCreateFeePlanPayload,
  buildLinePayload,
  installmentScheduleTotal,
  roundMoney,
  suggestEqualInstallments,
  validateFeePlanForm,
} from '@/features/admin/finance/fee-plans/fee-plan-payload';
import { computeFeePlanSummary } from '@/features/admin/finance/fee-plans/fee-plan-summary';
import {
  createEmptyFeePlanFormValues,
  newDraftLine,
  type FeePlanFormValues,
} from '@/features/admin/finance/fee-plans/fee-plan-types';

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

describe('fee plans workspace payload', () => {
  it('builds create payload with multiple lines and optional flag', () => {
    const required = newDraftLine('r');
    required.feeTypeId = 1;
    required.amount = 300;
    const optional = newDraftLine('o');
    optional.feeTypeId = 2;
    optional.amount = 150;
    optional.isOptional = true;

    const payload = buildCreateFeePlanPayload(
      sampleForm({ lines: [required, optional] }),
      3,
    );

    expect(payload.school_id).toBe(3);
    expect(payload.lines).toHaveLength(2);
    expect(payload.lines?.[0].is_optional).toBe(false);
    expect(payload.lines?.[1].is_optional).toBe(true);
    expect(payload.level_ids).toEqual([77]);
  });

  it('includes explicit installment schedule in line payload', () => {
    const line = newDraftLine('x');
    line.feeTypeId = 1;
    line.amount = 600;
    line.installmentCount = 2;
    line.scheduleMode = 'explicit';
    line.installmentSchedule = [
      { sequence: 1, due_date: '2026-09-01', amount: 300 },
      { sequence: 2, due_date: '2026-12-01', amount: 300 },
    ];

    const payload = buildLinePayload(line);
    expect(payload.installment_schedule).toHaveLength(2);
    expect(payload.installment_count).toBe(2);
  });

  it('uses on_assignment due_rule for multi-installment without explicit schedule', () => {
    const line = newDraftLine('x');
    line.feeTypeId = 1;
    line.amount = 400;
    line.installmentCount = 3;
    line.scheduleMode = 'on_assignment';

    const payload = buildLinePayload(line);
    expect(payload.due_rule).toBe('on_assignment');
    expect(payload.installment_count).toBe(3);
    expect(payload.installment_schedule).toBeUndefined();
  });

  it('rejects save without level scope', () => {
    const error = validateFeePlanForm(sampleForm({ levelIds: [] }), { requireLevel: true });
    expect(error?.field).toBe('levelIds');
    expect(error?.messageKey).toBe('admin.finance.feePlansWorkspace.errors.levelRequired');
  });

  it('rejects save when explicit schedule total mismatches amount', () => {
    const line = newDraftLine('x');
    line.feeTypeId = 1;
    line.amount = 500;
    line.installmentCount = 2;
    line.scheduleMode = 'explicit';
    line.installmentSchedule = [
      { sequence: 1, due_date: '2026-09-01', amount: 200 },
      { sequence: 2, due_date: '2026-12-01', amount: 200 },
    ];

    const error = validateFeePlanForm(sampleForm({ lines: [line] }), { requireLevel: true });
    expect(error?.messageKey).toBe('admin.finance.feePlansWorkspace.errors.scheduleMismatch');
  });

  it('accepts matching explicit schedule total', () => {
    const line = newDraftLine('x');
    line.feeTypeId = 1;
    line.amount = 500;
    line.installmentCount = 2;
    line.scheduleMode = 'explicit';
    line.installmentSchedule = [
      { sequence: 1, due_date: '2026-09-01', amount: 250 },
      { sequence: 2, due_date: '2026-12-01', amount: 250 },
    ];

    expect(validateFeePlanForm(sampleForm({ lines: [line] }), { requireLevel: true })).toBeNull();
  });

  it('computes plan summary totals', () => {
    const required = newDraftLine('r');
    required.feeTypeId = 1;
    required.amount = 1000;
    const optional = newDraftLine('o');
    optional.feeTypeId = 2;
    optional.amount = 200;
    optional.isOptional = true;

    const summary = computeFeePlanSummary([required, optional], 'MAD');
    expect(summary.lineCount).toBe(2);
    expect(summary.requiredCount).toBe(1);
    expect(summary.optionalCount).toBe(1);
    expect(summary.requiredTotal).toBe(1000);
    expect(summary.optionalTotal).toBe(200);
    expect(summary.grandTotal).toBe(1200);
  });

  it('suggestEqualInstallments absorbs rounding on last row', () => {
    const rows = suggestEqualInstallments(100, 3);
    expect(rows).toHaveLength(3);
    expect(roundMoney(installmentScheduleTotal(rows))).toBe(100);
  });
});

describe('fee plans workspace assign contract smoke', () => {
  it('include_lines remains in confirmed plans query', () => {
    const query = buildConfirmedFeePlansQuery(1, 77);
    expect(query?.include_lines).toBe(1);
    expect(query?.level_id).toBe(77);
  });
});

describe('fee plans workspace UI markers', () => {
  it('page module does not export inline form card', async () => {
    const pageSource = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/app/admin/finance/fee-plans/page.tsx', 'utf8'),
    );
    expect(pageSource).not.toContain('FinanceFeePlanForm');
    expect(pageSource).toContain('FeePlansPage');
  });

  it('workspace page uses drawer not inline showForm toggle', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/features/admin/finance/fee-plans/fee-plans-page.tsx', 'utf8'),
    );
    expect(source).not.toContain('showForm');
    expect(source).toContain('FeePlanDrawer');
    expect(source).toContain('isEmpty');
    expect(source).toContain('@design-status adopted');
    expect(source).not.toContain('records 0');
  });
});
