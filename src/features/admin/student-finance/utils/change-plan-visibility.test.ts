import { describe, expect, it } from 'vitest';
import { changePlanErrorMessageKey } from './change-plan-errors';
import { resolveChangePlanVisibility } from './resolve-change-plan-visibility';

describe('resolve-change-plan-visibility', () => {
  it('shows actions for active agreement with assign capability', () => {
    expect(
      resolveChangePlanVisibility({
        workspace: { current_agreement: { id: 1, state: 'active' } } as never,
        financialOverview: null,
        studentCapabilities: { can_assign_fees: true } as never,
      }),
    ).toEqual({ showChangePlan: true, showSpecialAdjustment: true });
  });

  it('shows actions when agreement context comes from financial overview installments', () => {
    expect(
      resolveChangePlanVisibility({
        workspace: null,
        financialOverview: {
          counts: { installments_count: 12, fees_count: 2 },
          capabilities: { can_collect: true },
        } as never,
        studentCapabilities: { can_collect_payments: true } as never,
      }),
    ).toEqual({ showChangePlan: true, showSpecialAdjustment: true });
  });

  it('shows actions when workspace agreement is manageable but not strictly active', () => {
    expect(
      resolveChangePlanVisibility({
        workspace: { current_agreement: { id: 9, state: 'approved' } } as never,
        financialOverview: null,
        studentCapabilities: { can_assign_fees: true } as never,
      }),
    ).toEqual({ showChangePlan: true, showSpecialAdjustment: true });
  });

  it('hides actions without agreement context', () => {
    expect(
      resolveChangePlanVisibility({
        workspace: { current_agreement: null } as never,
        financialOverview: { counts: { installments_count: 0, fees_count: 0 }, totals: { annual_total: 0 } } as never,
        studentCapabilities: { can_assign_fees: true } as never,
      }),
    ).toEqual({ showChangePlan: false, showSpecialAdjustment: false });
  });
});

describe('change-plan-errors', () => {
  it('maps pending cheque blocker code', () => {
    expect(changePlanErrorMessageKey('plan_change_blocked_by_pending_cheques')).toBe(
      'admin.student360.financeWorkspace.changePlan.errors.planChangeBlockedByPendingCheques',
    );
  });

  it('maps forbidden code', () => {
    expect(changePlanErrorMessageKey('forbidden')).toBe(
      'admin.student360.financeWorkspace.changePlan.errors.forbidden',
    );
  });
});
