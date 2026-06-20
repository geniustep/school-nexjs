import { describe, expect, it } from 'vitest';
import { changePlanErrorMessageKey } from './change-plan-errors';
import { resolveChangePlanVisibility } from './resolve-change-plan-visibility';

describe('resolve-change-plan-visibility', () => {
  it('shows actions for active agreement with assign capability', () => {
    expect(
      resolveChangePlanVisibility({
        agreementState: 'active',
        allowedActions: {},
        studentCapabilities: { can_assign_fees: true } as never,
        financeCapabilities: { can_assign_fees: true } as never,
      }),
    ).toEqual({ showReplaceIfUnpaid: true, showSocialDiscount: true });
  });

  it('hides actions without active agreement', () => {
    expect(
      resolveChangePlanVisibility({
        agreementState: 'draft',
        allowedActions: { change_plan: true },
        studentCapabilities: {} as never,
        financeCapabilities: null,
      }),
    ).toEqual({ showReplaceIfUnpaid: false, showSocialDiscount: false });
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
