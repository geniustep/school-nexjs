import { describe, expect, it } from 'vitest';
import {
  feePlanAssignErrorMessageKey,
  shouldReloadPlansOnAssignError,
} from './fee-plan-assign-errors';
import {
  assignableLineIds,
  mergeFeePlanWithDetailLines,
  needsFeePlanDetailFetch,
  planListHasAssignableLines,
} from './fee-plan-assign-lines';
import { buildConfirmedFeePlansQuery } from './fee-plan-assign-query';
import {
  buildAssignFeePlanPayload,
  buildInstallmentPreview,
  canSubmitFeePlanAssignment,
  filterFeePlansForAcademicYear,
  partitionFeePlanLines,
  planHasNoAssignableLines,
  planLinesContractInvalid,
  resolveDefaultEffectiveDate,
} from './fee-plan-assign-utils';
import { normalizeFeePlanLine, normalizeFeePlanLines } from '@/lib/utils/fee-plan-line-normalize';
import type { FeePlan, FeePlanLine } from '@/types/finance';

describe('buildConfirmedFeePlansQuery', () => {
  it('returns null without academic year', () => {
    expect(buildConfirmedFeePlansQuery(null)).toBeNull();
    expect(buildConfirmedFeePlansQuery('')).toBeNull();
  });

  it('includes confirmed state, academic_year_id, and include_lines', () => {
    expect(buildConfirmedFeePlansQuery(3)).toEqual({
      page: 1,
      page_size: 100,
      state: 'confirmed',
      academic_year_id: 3,
      include_lines: 1,
    });
  });

  it('adds level_id when provided', () => {
    expect(buildConfirmedFeePlansQuery(3, 12)).toEqual({
      page: 1,
      page_size: 100,
      state: 'confirmed',
      academic_year_id: 3,
      include_lines: 1,
      level_id: 12,
    });
  });

  it('omits level_id when not provided', () => {
    const query = buildConfirmedFeePlansQuery(3, null);
    expect(query).not.toHaveProperty('level_id');
  });
});

describe('normalizeFeePlanLine', () => {
  it('returns null when id or is_optional is missing', () => {
    expect(normalizeFeePlanLine({ amount: 100, fee_type_id: 1, is_optional: false })).toBeNull();
    expect(normalizeFeePlanLine({ id: 1, amount: 100, fee_type_id: 1 })).toBeNull();
  });

  it('normalizes required and optional lines with schedule', () => {
    const line = normalizeFeePlanLine({
      id: 10,
      is_optional: true,
      name: 'Transport',
      amount: 500,
      subtotal: 500,
      fee_type: { id: 2, code: 'TR', name: 'Transport', category: 'service' },
      installment_count: 2,
      installment_schedule: [
        { sequence: 1, due_date: '2026-09-01', amount: 250 },
        { sequence: 2, due_date: '2026-12-01', amount: 250 },
      ],
    });
    expect(line?.id).toBe(10);
    expect(line?.is_optional).toBe(true);
    expect(line?.installment_schedule).toHaveLength(2);
  });
});

describe('partitionFeePlanLines', () => {
  const lines: FeePlanLine[] = [
    { id: 1, amount: 100, is_optional: false, fee_type_id: 1 },
    { id: 2, amount: 50, is_optional: true, fee_type_id: 2 },
  ];

  it('splits required and optional lines', () => {
    const { required, optional } = partitionFeePlanLines(lines);
    expect(required.map((l) => l.id)).toEqual([1]);
    expect(optional.map((l) => l.id)).toEqual([2]);
  });
});

describe('buildAssignFeePlanPayload', () => {
  it('sends empty optional array explicitly', () => {
    expect(buildAssignFeePlanPayload(1019, '2026-09-01', [])).toEqual({
      fee_plan_id: 1019,
      effective_date: '2026-09-01',
      selected_optional_line_ids: [],
    });
  });

  it('sends only selected optional line ids for fixture activity A', () => {
    expect(buildAssignFeePlanPayload(1144, '2026-09-01', [1266])).toEqual({
      fee_plan_id: 1144,
      effective_date: '2026-09-01',
      selected_optional_line_ids: [1266],
    });
  });

  it('does not include required line ids in payload helper input', () => {
    const payload = buildAssignFeePlanPayload(1019, '2026-09-01', [1262]);
    expect(payload.selected_optional_line_ids).not.toContain(1001);
  });
});

describe('buildInstallmentPreview', () => {
  it('merges schedules from selected lines without inventing dates', () => {
    const lines: FeePlanLine[] = [
      {
        id: 1,
        amount: 1000,
        is_optional: false,
        fee_type_id: 1,
        name: 'Scolarité',
        installment_schedule: [{ sequence: 1, due_date: '2026-09-01', amount: 500 }],
      },
      {
        id: 2,
        amount: 200,
        is_optional: true,
        fee_type_id: 2,
        name: 'Cantine',
        installment_schedule: [{ sequence: 1, due_date: '2026-10-01', amount: 200 }],
      },
    ];
    const preview = buildInstallmentPreview(lines);
    expect(preview).toHaveLength(2);
    expect(preview.map((r) => r.due_date)).toEqual(['2026-09-01', '2026-10-01']);
  });
});

describe('canSubmitFeePlanAssignment', () => {
  it('disables submit while loading, errored, incomplete, or without assignable lines', () => {
    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '1',
        feePlanId: '10',
        effectiveDate: '2026-09-01',
        plansLoading: true,
        plansError: false,
        planDetailsLoading: false,
        planDetailsError: false,
        planLinesReady: true,
        submitting: false,
        planHasAssignableLines: true,
        planLinesContractError: false,
      }),
    ).toBe(false);

    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '1',
        feePlanId: '10',
        effectiveDate: '2026-09-01',
        plansLoading: false,
        plansError: false,
        planDetailsLoading: true,
        planDetailsError: false,
        planLinesReady: false,
        submitting: false,
        planHasAssignableLines: true,
        planLinesContractError: false,
      }),
    ).toBe(false);

    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '1',
        feePlanId: '10',
        effectiveDate: '',
        plansLoading: false,
        plansError: false,
        planDetailsLoading: false,
        planDetailsError: false,
        planLinesReady: true,
        submitting: false,
        planHasAssignableLines: true,
        planLinesContractError: false,
      }),
    ).toBe(false);

    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '1',
        feePlanId: '10',
        effectiveDate: '2026-09-01',
        plansLoading: false,
        plansError: false,
        planDetailsLoading: false,
        planDetailsError: false,
        planLinesReady: true,
        submitting: false,
        planHasAssignableLines: false,
        planLinesContractError: false,
      }),
    ).toBe(false);

    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '1',
        feePlanId: '10',
        effectiveDate: '2026-09-01',
        plansLoading: false,
        plansError: false,
        planDetailsLoading: false,
        planDetailsError: false,
        planLinesReady: true,
        submitting: false,
        planHasAssignableLines: true,
        planLinesContractError: false,
      }),
    ).toBe(true);
  });
});

describe('fee plan list vs detail line loading', () => {
  const detailLines: FeePlanLine[] = [
    { id: 1264, amount: 300, is_optional: false, fee_type_id: 1 },
    { id: 1265, amount: 1200, is_optional: false, fee_type_id: 2 },
    { id: 1266, amount: 150, is_optional: true, fee_type_id: 3 },
    { id: 1267, amount: 250, is_optional: true, fee_type_id: 4 },
  ];

  it('uses list lines when assignable lines are already present', () => {
    const listPlan: FeePlan = {
      id: 1144,
      code: 'QA',
      name: 'QA',
      school_id: 3,
      lines: detailLines,
    };
    expect(needsFeePlanDetailFetch(listPlan)).toBe(false);
    expect(planListHasAssignableLines(listPlan)).toBe(true);
  });

  it('requires detail fetch when list item has no lines', () => {
    const listPlan: FeePlan = { id: 1144, code: 'QA', name: 'QA', school_id: 3, lines: [] };
    expect(needsFeePlanDetailFetch(listPlan)).toBe(true);
    expect(planListHasAssignableLines(listPlan)).toBe(false);
  });

  it('merges detail lines onto the selected list plan', () => {
    const listPlan: FeePlan = { id: 1144, code: 'QA', name: 'QA Plan', school_id: 3 };
    const merged = mergeFeePlanWithDetailLines(listPlan, {
      id: 1144,
      code: 'QA',
      name: 'QA Plan',
      school_id: 3,
      lines: detailLines,
    });
    expect(assignableLineIds(merged).required).toEqual([1264, 1265]);
    expect(assignableLineIds(merged).optional).toEqual([1266, 1267]);
  });
});

describe('plan empty and contract states', () => {
  it('detects plan without assignable lines', () => {
    expect(planHasNoAssignableLines({ id: 1, code: 'X', name: 'X', school_id: 1, lines: [] })).toBe(
      true,
    );
  });

  it('detects contract-invalid normalized lines', () => {
    const plan: FeePlan = {
      id: 1,
      code: 'X',
      name: 'X',
      school_id: 1,
      lines: [{ id: 1, amount: 10, fee_type_id: 1 } as FeePlanLine],
    };
    expect(planLinesContractInvalid(plan)).toBe(true);
  });
});

describe('resolveDefaultEffectiveDate', () => {
  it('prefers join date then enrollment start then today', () => {
    expect(
      resolveDefaultEffectiveDate({
        actualJoinDate: '2026-09-15T00:00:00',
        enrollmentStartDate: '2026-09-01',
        today: '2026-06-14',
      }),
    ).toBe('2026-09-15');
    expect(
      resolveDefaultEffectiveDate({
        enrollmentStartDate: '2026-09-01',
        today: '2026-06-14',
      }),
    ).toBe('2026-09-01');
  });
});

describe('filterFeePlansForAcademicYear', () => {
  const plans: FeePlan[] = [
    { id: 1, code: 'A', name: 'Plan A', school_id: 1, academic_year_id: 2 },
    {
      id: 2,
      code: 'B',
      name: 'Plan B',
      school_id: 1,
      academic_year: { id: 3, name: '2025-2026' },
    },
  ];

  it('filters plans to the selected year', () => {
    expect(filterFeePlansForAcademicYear(plans, 2).map((p) => p.id)).toEqual([1]);
    expect(filterFeePlansForAcademicYear(plans, 3).map((p) => p.id)).toEqual([2]);
  });
});

describe('fee plan assign errors', () => {
  it('maps fee_plan_already_assigned', () => {
    expect(feePlanAssignErrorMessageKey('fee_plan_already_assigned')).toBe(
      'admin.finance.assignErrors.feePlanAlreadyAssigned',
    );
  });

  it('reloads plans on invalid_fee_plan_state', () => {
    expect(shouldReloadPlansOnAssignError('invalid_fee_plan_state')).toBe(true);
  });
});

describe('Student 360 fee assign drawer contract', () => {
  it('exposes assign fee drawer component wrapping the form in SetupDrawer', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const drawerFile = path.join(
      process.cwd(),
      'src/features/admin/students/components/student-finance-assign-fee-drawer.tsx',
    );
    const text = await fs.readFile(drawerFile, 'utf8');
    expect(text).toContain('StudentFinanceAssignFeeDrawer');
    expect(text).toContain('SetupDrawer');
    expect(text).toContain('FinanceAssignFeeForm');
    expect(text).not.toContain('student-finance-assign-card');
  });

  it('keeps student finance tab free of inline assign card', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const tabFile = path.join(
      process.cwd(),
      'src/features/admin/students/components/student-finance-tab.tsx',
    );
    const opsFile = path.join(
      process.cwd(),
      'src/features/admin/student-finance/components/student-finance-operations-tab.tsx',
    );
    const tabText = await fs.readFile(tabFile, 'utf8');
    const opsText = await fs.readFile(opsFile, 'utf8');
    expect(tabText).not.toContain('<FinanceAssignFeeForm');
    expect(tabText).not.toContain('student-finance-assign-card');
    expect(opsText).not.toContain('<FinanceAssignFeeForm');
    expect(opsText).not.toContain('student-finance-assign-card');
  });

  it('marks RTL layout hook for assign actions', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(process.cwd(), 'src/features/admin/students/student-360.css');
    const css = await fs.readFile(file, 'utf8');
    expect(css).toContain("[dir='rtl'] .student-finance-assign-form__actions");
    expect(css).toContain("[dir='rtl'] .student-finance-assign-form__optional-row");
  });
});

describe('assign fee form UI contract', () => {
  it('renders required and optional sections with checkboxes', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(process.cwd(), 'src/features/admin/finance/assign-fee-form.tsx');
    const text = await fs.readFile(file, 'utf8');
    expect(text).toContain("label('requiredFees')");
    expect(text).toContain("label('optionalServices')");
    expect(text).toContain('type="checkbox"');
    expect(text).toContain('selectedOptionalIds');
    expect(text).toContain('buildAssignFeePlanPayload');
    expect(text).toContain('installmentPreview');
    expect(text).toContain('useFeePlanAssignLines');
    expect(text).toContain("label('loadingPlanDetails')");
  });

  it('loads plan lines from detail endpoint when list lacks lines', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const hookFile = path.join(process.cwd(), 'src/features/admin/finance/use-fee-plan-assign-lines.ts');
    const hook = await fs.readFile(hookFile, 'utf8');
    expect(hook).toContain('endpoints.admin.financeFeePlan');
    expect(hook).toContain('needsFeePlanDetailFetch');
  });

  it('uses assign-fee-plan endpoint', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(process.cwd(), 'src/lib/api/endpoints.ts');
    const text = await fs.readFile(file, 'utf8');
    expect(text).toContain('/assign-fee-plan');
  });
});

describe('useConfirmedFeePlanOptions query merge', () => {
  it('requires academic year before querying plans', () => {
    expect(buildConfirmedFeePlansQuery('2024')).toMatchObject({
      academic_year_id: 2024,
      state: 'confirmed',
      include_lines: 1,
    });
  });
});
