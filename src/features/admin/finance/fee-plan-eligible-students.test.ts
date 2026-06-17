import { describe, expect, it } from 'vitest';
import {
  buildFeePlanEligibleStudentsQuery,
} from '@/features/admin/finance/use-fee-plan-eligible-students';
import {
  feePlanBillingReadinessLabelKey,
  feePlanEligibilityReasonLabelKey,
  feePlanEligibleStudentsErrorMessageKey,
} from '@/features/admin/finance/fee-plan-eligibility-labels';
import {
  normalizeFeePlanEligibleStudent,
  normalizeFeePlanEligibleStudentsResponse,
  normalizeFeePlanEligibilityPagination,
} from '@/lib/utils/fee-plan-eligible-students-normalize';
import { endpoints } from '@/lib/api/endpoints';

describe('buildFeePlanEligibleStudentsQuery', () => {
  it('defaults to eligible page 1 size 25', () => {
    expect(buildFeePlanEligibleStudentsQuery({ tab: 'eligible' })).toEqual({
      eligibility_status: 'eligible',
      search: undefined,
      level_id: undefined,
      class_id: undefined,
      page: 1,
      page_size: 25,
    });
  });

  it('passes filters and pagination', () => {
    expect(
      buildFeePlanEligibleStudentsQuery({
        tab: 'already_assigned',
        search: '  ali  ',
        levelId: '5',
        classId: '12',
        page: 2,
        pageSize: 50,
      }),
    ).toEqual({
      eligibility_status: 'already_assigned',
      search: 'ali',
      level_id: 5,
      class_id: 12,
      page: 2,
      page_size: 50,
    });
  });
});

describe('normalizeFeePlanEligibleStudentsResponse', () => {
  const payload = {
    plan: { id: 2425 },
    summary: { eligible_count: 6, already_assigned_count: 1, ineligible_count: 3 },
    students: [
      {
        id: 10,
        name: 'Ali',
        registration_number: 'REG-1',
        level: { id: 5, name: 'CP' },
        class: { id: 2, name: 'CP-A' },
        enrollment_status: 'active',
        eligibility_status: 'eligible',
        eligibility_reason: null,
        selectable: true,
        already_assigned: false,
        billing_ready: true,
        billing_will_be_created_automatically: false,
      },
      {
        id: 11,
        name: 'Sara',
        registration_number: 'REG-2',
        level: { id: 99, name: 'CM2' },
        class: null,
        enrollment_status: 'active',
        eligibility_status: 'level_out_of_scope',
        eligibility_reason: 'Outside plan level scope',
        selectable: false,
        already_assigned: false,
        billing_ready: false,
        billing_will_be_created_automatically: true,
      },
    ],
    pagination: { page: 1, page_size: 25, total: 6 },
  };

  it('normalizes students level/class and summary counts', () => {
    const data = normalizeFeePlanEligibleStudentsResponse(payload);
    expect(data?.summary.eligible_count).toBe(6);
    expect(data?.students[0].level?.name).toBe('CP');
    expect(data?.students[0].class?.name).toBe('CP-A');
    expect(data?.students[1].selectable).toBe(false);
  });

  it('does not coerce selectable to true', () => {
    const student = normalizeFeePlanEligibleStudent(payload.students[1]);
    expect(student?.selectable).toBe(false);
  });

  it('computes pagination total_pages', () => {
    expect(normalizeFeePlanEligibilityPagination({ page: 1, page_size: 25, total: 63 }).total_pages).toBe(3);
  });
});

describe('fee plan eligibility labels', () => {
  it('maps billing auto-create readiness', () => {
    expect(
      feePlanBillingReadinessLabelKey({
        billing_ready: false,
        billing_will_be_created_automatically: true,
      }),
    ).toBe('admin.finance.assignFlow.billingWillBeCreated');
  });

  it('maps ineligible reason from backend text', () => {
    expect(
      feePlanEligibilityReasonLabelKey({
        eligibility_status: 'level_out_of_scope',
        eligibility_reason: 'Outside plan level scope',
      }),
    ).toBe('admin.finance.assignFlow.ineligibleReason.levelOutOfScope');
  });

  it('maps known API error codes', () => {
    expect(feePlanEligibleStudentsErrorMessageKey('fee_plan_not_assignable')).toBe(
      'admin.finance.assignFlow.errors.feePlanNotAssignable',
    );
  });
});

describe('eligible students BFF endpoint', () => {
  it('uses finance fee plan eligible students path', () => {
    expect(endpoints.admin.financeFeePlanEligibleStudents(2425)).toContain(
      '/finance/fee-plans/2425/eligible-students',
    );
  });
});

describe('assign flow integration contract', () => {
  it('uses eligible students step instead of financeStudentsSearch', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const flow = await fs.readFile(
      path.join(process.cwd(), 'src/features/admin/finance/fee-plan-assign-flow.tsx'),
      'utf8',
    );
    const step = await fs.readFile(
      path.join(process.cwd(), 'src/features/admin/finance/fee-plan-assign-students-step.tsx'),
      'utf8',
    );
    expect(flow).toContain('FeePlanAssignStudentsStep');
    expect(flow).not.toContain('financeStudentsSearch');
    expect(flow).not.toContain('assessStudentEligibility');
    expect(step).toContain('useFeePlanEligibleStudents');
    expect(step).toContain('fee-plan-assign-flow__footer--sticky');
  });

  it('uses currencyLabel not raw admin.finance.currency', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const ui = await fs.readFile(
      path.join(process.cwd(), 'src/features/admin/finance/fee-plan-assign-ui.tsx'),
      'utf8',
    );
    expect(ui).toContain("t('admin.finance.currencyLabel')");
    expect(ui).not.toContain("t('admin.finance.currency')");
  });

  it('shows monthly installment label in detail view', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const detail = await fs.readFile(
      path.join(process.cwd(), 'src/features/admin/finance/fee-plans/fee-plan-detail-view.tsx'),
      'utf8',
    );
    expect(detail).toContain('detailMonthlyInstallmentCount');
  });
});
