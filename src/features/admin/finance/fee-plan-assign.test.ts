import { describe, expect, it } from 'vitest';
import { buildConfirmedFeePlansQuery } from './fee-plan-assign-query';
import {
  canSubmitFeePlanAssignment,
  filterFeePlansForAcademicYear,
} from './fee-plan-assign-utils';
import type { FeePlan } from '@/types/finance';

describe('buildConfirmedFeePlansQuery', () => {
  it('returns null without academic year', () => {
    expect(buildConfirmedFeePlansQuery(null)).toBeNull();
    expect(buildConfirmedFeePlansQuery('')).toBeNull();
  });

  it('includes confirmed state and academic_year_id', () => {
    expect(buildConfirmedFeePlansQuery(3)).toEqual({
      page: 1,
      page_size: 100,
      state: 'confirmed',
      academic_year_id: 3,
    });
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

describe('canSubmitFeePlanAssignment', () => {
  it('disables submit while loading, errored, or incomplete', () => {
    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '1',
        feePlanId: '10',
        plansLoading: true,
        plansError: false,
        submitting: false,
      }),
    ).toBe(false);

    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '1',
        feePlanId: '10',
        plansLoading: false,
        plansError: true,
        submitting: false,
      }),
    ).toBe(false);

    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '',
        feePlanId: '10',
        plansLoading: false,
        plansError: false,
        submitting: false,
      }),
    ).toBe(false);

    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '1',
        feePlanId: '',
        plansLoading: false,
        plansError: false,
        submitting: false,
      }),
    ).toBe(false);

    expect(
      canSubmitFeePlanAssignment({
        academicYearId: '1',
        feePlanId: '10',
        plansLoading: false,
        plansError: false,
        submitting: false,
      }),
    ).toBe(true);
  });
});

describe('Student 360 fee assign drawer contract', () => {
  it('uses drawer wrapper instead of inline assign card', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(
      process.cwd(),
      'src/features/admin/students/components/student-finance-tab.tsx',
    );
    const text = await fs.readFile(file, 'utf8');
    expect(text).toContain('StudentFinanceAssignFeeDrawer');
    expect(text).not.toContain('student-finance-assign-card');
    expect(text).not.toContain('<FinanceAssignFeeForm');
  });

  it('marks RTL layout hook for assign actions', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(process.cwd(), 'src/features/admin/students/student-360.css');
    const css = await fs.readFile(file, 'utf8');
    expect(css).toContain("[dir='rtl'] .student-finance-assign-form__actions");
  });
});

describe('useConfirmedFeePlanOptions query merge', () => {
  it('requires academic year before querying plans', () => {
    expect(buildConfirmedFeePlansQuery('2024')).toMatchObject({
      academic_year_id: 2024,
      state: 'confirmed',
    });
  });
});
