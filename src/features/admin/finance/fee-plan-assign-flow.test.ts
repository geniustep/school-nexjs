import { describe, expect, it } from 'vitest';
import {
  assessStudentEligibility,
  filterEligibilityRows,
  studentMatchesPlanLevels,
} from './fee-plan-assign-eligibility';
import { validateFeePlanForAssignment, lineHasFrequencyInstallmentConflict } from './fee-plan-assign-validation';
import { computeLineExpectedTotal } from './fee-plan-assign-utils';
import type { FeePlan, FeePlanLine, FinanceStudentSearchResult } from '@/types/finance';

describe('lineHasFrequencyInstallmentConflict', () => {
  it('detects one_time with multiple installments', () => {
    const line: FeePlanLine = {
      id: 1,
      amount: 2500,
      is_optional: false,
      fee_type_id: 1,
      frequency: 'one_time',
      installment_count: 10,
    };
    expect(lineHasFrequencyInstallmentConflict(line)).toBe(true);
  });
});

describe('computeLineExpectedTotal', () => {
  it('uses expected_total from API for recurring monthly', () => {
    const line: FeePlanLine = {
      id: 2,
      amount: 2000,
      is_optional: false,
      fee_type_id: 2,
      frequency: 'monthly',
      installment_count: 10,
      pricing_mode: 'recurring_unit_price',
      expected_total: 20000,
      installment_amount: 2000,
    };
    expect(computeLineExpectedTotal(line)).toBe(20000);
  });

  it('multiplies monthly amount by installment count when legacy', () => {
    const line: FeePlanLine = {
      id: 2,
      amount: 2000,
      is_optional: false,
      fee_type_id: 2,
      frequency: 'monthly',
      installment_count: 10,
    };
    expect(computeLineExpectedTotal(line)).toBe(20000);
  });

  it('returns one-time amount as-is', () => {
    const line: FeePlanLine = {
      id: 1,
      amount: 2500,
      is_optional: false,
      fee_type_id: 1,
      frequency: 'one_time',
      installment_count: 1,
    };
    expect(computeLineExpectedTotal(line)).toBe(2500);
  });
});

describe('studentMatchesPlanLevels', () => {
  const student: FinanceStudentSearchResult = {
    id: 1,
    name: 'Test',
    level: { id: 5, name: 'Primary' },
  };

  it('matches when student level is in plan levels', () => {
    expect(studentMatchesPlanLevels(student, [5, 6])).toBe(true);
  });

  it('rejects when level out of scope', () => {
    expect(studentMatchesPlanLevels(student, [7])).toBe(false);
  });
});

describe('assessStudentEligibility', () => {
  const plan = {
    id: 100,
    name: 'Plan',
    code: 'P1',
    school_id: 1,
    level_ids: [5],
    lines: [],
  } as unknown as FeePlan;

  it('marks eligible student in scope', () => {
    const row = assessStudentEligibility(
      { id: 1, level: { id: 5, name: 'L' } },
      plan,
    );
    expect(row.status).toBe('eligible');
    expect(row.selectable).toBe(true);
  });

  it('marks level out of scope', () => {
    const row = assessStudentEligibility(
      { id: 2, level: { id: 99, name: 'X' } },
      plan,
    );
    expect(row.status).toBe('level_out_of_scope');
    expect(row.selectable).toBe(false);
  });
});

describe('validateFeePlanForAssignment', () => {
  it('blocks inconsistent plan lines', () => {
    const plan = {
      id: 1,
      name: '2025-2026 Plan',
      code: 'X',
      state: 'confirmed',
      lines: [
        {
          id: 1,
          amount: 2500,
          is_optional: false,
          fee_type_id: 1,
          frequency: 'one_time',
          installment_count: 10,
        },
      ],
    } as FeePlan;
    const result = validateFeePlanForAssignment(plan, '2025-2026');
    expect(result.canAssign).toBe(false);
    expect(result.blockReasons).toContain('frequency_installment_conflict');
  });
});

describe('assign route contract', () => {
  it('uses fee-plans assign path not broken students index', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const detailView = await fs.readFile(
      path.join(process.cwd(), 'src/features/admin/finance/fee-plans/fee-plan-detail-view.tsx'),
      'utf8',
    );
    expect(detailView).toContain('/assign');
    expect(detailView).not.toContain('href="/admin/finance/students"');

    const assignPage = await fs.readFile(
      path.join(process.cwd(), 'src/app/admin/finance/fee-plans/[id]/assign/page.tsx'),
      'utf8',
    );
    expect(assignPage).toContain('FeePlanAssignFlow');

    const redirectPage = await fs.readFile(
      path.join(process.cwd(), 'src/app/admin/finance/students/page.tsx'),
      'utf8',
    );
    expect(redirectPage).toContain('redirect');
    expect(redirectPage).toContain('fee-plans');
  });
});

describe('filterEligibilityRows', () => {
  const rows = [
    assessStudentEligibility({ id: 1, name: 'Ali', level: { id: 5, name: 'L' } }, {
      id: 1,
      level_ids: [5],
    } as FeePlan),
    assessStudentEligibility({ id: 2, name: 'Sara', level: { id: 9, name: 'X' } }, {
      id: 1,
      level_ids: [5],
    } as FeePlan),
  ];

  it('filters non-eligible when requested', () => {
    const filtered = filterEligibilityRows(rows, {
      search: '',
      levelId: '',
      classId: '',
      statusFilter: 'not_eligible',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].student.id).toBe(2);
  });
});
