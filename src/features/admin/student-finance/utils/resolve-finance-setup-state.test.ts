import { describe, expect, it } from 'vitest';
import {
  buildStudentFinanceAgreementsHref,
  isPreActiveAgreementState,
  resolvePreActiveFinancialAgreement,
} from './resolve-pre-active-financial-agreement';
import {
  buildStudentFinanceScheduleHref,
  canSafelyAssignFinancePlan,
  isInactiveAgreementState,
  resolveAlreadyAssignedErrorKey,
  resolveFinanceSetupState,
  shouldBlockAssignPlanForSetupState,
} from './resolve-finance-setup-state';
import {
  isAlreadyAssignedAssignError,
  resolveAssignErrorMessage,
} from '@/features/admin/finance/fee-plan-assign-errors';
import type { FinancialAgreement } from '../types';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

const t = (key: string) => key;

const draftFromList: FinancialAgreement[] = [
  {
    id: 3,
    student_id: 5,
    state: 'draft',
    number: 'FA/2026/00003',
    academic_year_id: 1,
  },
];

const cancelledFromList: FinancialAgreement[] = [
  {
    id: 3,
    student_id: 5,
    state: 'cancelled',
    number: 'FA/2026/00003',
    academic_year_id: 1,
  },
];

function overviewWithFees(overdue = 2300): StudentFinancialOverview {
  return {
    academic_year: { id: 1, name: '2025-2026' },
    totals: {
      currency: { name: 'MAD', symbol: 'DH' },
      annual_total: 0,
      due_to_date: overdue,
      paid: 0,
      paid_confirmed: 0,
      pending_cheque: 0,
      covered_total: 0,
      remaining: overdue,
      overdue,
      upcoming: overdue,
    },
    counts: { fees_count: 0, installments_count: 1 },
    next_installment: {
      id: 1,
      amount: overdue,
      remaining_amount: overdue,
      due_date: '2026-07-01',
    },
    cheque_summary: null,
    applied_plans: [],
    special_agreement: null,
    billing_profile: null,
  };
}

describe('resolveFinanceSetupState', () => {
  it('clean_no_finance allows assign-plan', () => {
    const state = resolveFinanceSetupState({
      financialOverview: {
        ...overviewWithFees(0),
        totals: {
          ...overviewWithFees(0).totals,
          overdue: 0,
          upcoming: 0,
          due_to_date: 0,
          remaining: 0,
        },
        counts: { fees_count: 0, installments_count: 0 },
        next_installment: null,
      },
      agreementsList: [],
      financialOverviewLoaded: true,
      agreementsListLoaded: true,
      workspaceLoaded: true,
    });
    expect(state.kind).toBe('clean_no_finance');
    expect(state.canSafelyAssignPlan).toBe(true);
    expect(canSafelyAssignFinancePlan(state.kind)).toBe(true);
    expect(shouldBlockAssignPlanForSetupState(state.kind)).toBe(false);
  });

  it('pre_active_agreement blocks assign-plan and is not cancelled', () => {
    const state = resolveFinanceSetupState({
      agreementsList: draftFromList,
      academicYearId: 1,
      financialOverviewLoaded: true,
      agreementsListLoaded: true,
      workspaceLoaded: true,
    });
    expect(state.kind).toBe('pre_active_agreement');
    expect(state.canSafelyAssignPlan).toBe(false);
    expect(isPreActiveAgreementState('draft')).toBe(true);
    expect(isPreActiveAgreementState('cancelled')).toBe(false);
  });

  it('assigned_fees_without_active_agreement blocks assign-plan', () => {
    const state = resolveFinanceSetupState({
      financialOverview: overviewWithFees(),
      agreementsList: [],
      financialOverviewLoaded: true,
      agreementsListLoaded: true,
      workspaceLoaded: true,
    });
    expect(state.kind).toBe('assigned_fees_without_active_agreement');
    expect(state.canSafelyAssignPlan).toBe(false);
    expect(state.hasExistingFees).toBe(true);
  });

  it('cancelled_or_inactive_agreement_with_fees blocks assign-plan', () => {
    const state = resolveFinanceSetupState({
      financialOverview: overviewWithFees(),
      agreementsList: cancelledFromList,
      academicYearId: 1,
      financialOverviewLoaded: true,
      agreementsListLoaded: true,
      workspaceLoaded: true,
    });
    expect(state.kind).toBe('cancelled_or_inactive_agreement_with_fees');
    expect(state.canSafelyAssignPlan).toBe(false);
    expect(state.inactiveAgreement?.state).toBe('cancelled');
    expect(isInactiveAgreementState('cancelled')).toBe(true);
  });

  it('unknown_or_api_gap blocks assign-plan when data is missing', () => {
    const state = resolveFinanceSetupState({
      financialOverview: null,
      agreementsList: null,
      workspace: null,
      financialOverviewLoaded: true,
      agreementsListLoaded: true,
      workspaceLoaded: true,
    });
    expect(state.kind).toBe('unknown_or_api_gap');
    expect(state.canSafelyAssignPlan).toBe(false);
  });

  it('cancelled is not treated as pre_active_agreement', () => {
    expect(
      resolvePreActiveFinancialAgreement({
        agreementsList: cancelledFromList,
        academicYearId: 1,
      }),
    ).toBeNull();
    const state = resolveFinanceSetupState({
      agreementsList: cancelledFromList,
      academicYearId: 1,
      financialOverviewLoaded: true,
      agreementsListLoaded: true,
      workspaceLoaded: true,
    });
    expect(state.kind).not.toBe('pre_active_agreement');
  });

  it('active_agreement blocks new assign-plan', () => {
    const state = resolveFinanceSetupState({
      workspace: {
        current_agreement: { id: 9, student_id: 5, state: 'active' },
      } as never,
      financialOverviewLoaded: true,
      agreementsListLoaded: true,
      workspaceLoaded: true,
    });
    expect(state.kind).toBe('active_agreement');
    expect(state.canSafelyAssignPlan).toBe(false);
  });
});

describe('navigation hrefs', () => {
  it('open schedule uses financeSubTab=schedule', () => {
    expect(buildStudentFinanceScheduleHref(5)).toBe(
      '/admin/students/5?tab=finance&financeSubTab=schedule',
    );
  });

  it('open agreements uses financeSubTab=agreements', () => {
    expect(buildStudentFinanceAgreementsHref(5)).toBe(
      '/admin/students/5?tab=finance&financeSubTab=agreements',
    );
  });
});

describe('422 already-assigned error translation', () => {
  const raw = 'Fees from this plan were already assigned to the student.';

  it('never returns raw english message', () => {
    const message = resolveAssignErrorMessage('business_error', raw, t, null);
    expect(message).not.toContain('already assigned');
    expect(message).toBe('admin.finance.assignErrors.feesAlreadyAssignedFallback');
  });

  it('maps by pre_active_agreement state', () => {
    expect(resolveAlreadyAssignedErrorKey('pre_active_agreement')).toBe(
      'admin.finance.assignErrors.draftAgreementBlocksAssignPlan',
    );
    expect(resolveAssignErrorMessage('fee_plan_already_assigned', '', t, 'pre_active_agreement')).toBe(
      'admin.finance.assignErrors.draftAgreementBlocksAssignPlan',
    );
  });

  it('maps by assigned_fees_without_active_agreement state', () => {
    expect(
      resolveAssignErrorMessage('business_error', raw, t, 'assigned_fees_without_active_agreement'),
    ).toBe('admin.finance.assignErrors.assignedFeesBlocksAssignPlan');
  });

  it('maps by cancelled_or_inactive_agreement_with_fees state', () => {
    expect(
      resolveAssignErrorMessage(
        'business_error',
        raw,
        t,
        'cancelled_or_inactive_agreement_with_fees',
      ),
    ).toBe('admin.finance.assignErrors.inactiveAgreementFeesBlocksAssignPlan');
  });

  it('detects already-assigned errors', () => {
    expect(isAlreadyAssignedAssignError('fee_plan_already_assigned', '')).toBe(true);
    expect(isAlreadyAssignedAssignError('business_error', raw)).toBe(true);
  });
});

describe('confirm button safety', () => {
  it('only clean_no_finance allows assign-plan confirmation path', () => {
    expect(canSafelyAssignFinancePlan('clean_no_finance')).toBe(true);
    expect(canSafelyAssignFinancePlan('pre_active_agreement')).toBe(false);
    expect(canSafelyAssignFinancePlan('assigned_fees_without_active_agreement')).toBe(false);
    expect(canSafelyAssignFinancePlan('cancelled_or_inactive_agreement_with_fees')).toBe(false);
    expect(canSafelyAssignFinancePlan('unknown_or_api_gap')).toBe(false);
  });
});
