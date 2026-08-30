import { canCreateGuardians } from '@/lib/permissions/academic-capabilities';
import {
  canManageBillingProfile,
  canManageDiscounts as userCanManageDiscounts,
} from '@/lib/permissions/finance';
import type { CurrentUser } from '@/types/user';

/**
 * UI-facing capability gates for the single-student registration journey.
 * Odoo remains the authority.
 *
 * Base finance is a registration invariant in the full student-create wizard:
 * it is not a user-triggered "assign fee plan" action anymore. The wizard
 * therefore always attempts automatic Base Plan finance and lets Odoo enforce
 * the canonical authorization and fail-closed contract.
 */
export interface StudentCreateJourneyCapabilities {
  canCreateNewGuardian: boolean;
  canAssignFeePlan: boolean;
  canManageDiscounts: boolean;
  canManageBillingProfile: boolean;
}

export function resolveStudentCreateJourneyCapabilities(
  user: CurrentUser | null | undefined,
): StudentCreateJourneyCapabilities {
  return {
    canCreateNewGuardian: canCreateGuardians(user),
    canAssignFeePlan: true,
    canManageDiscounts: userCanManageDiscounts(user ?? null),
    canManageBillingProfile: canManageBillingProfile(user ?? null),
  };
}

export function shouldForceSkipFinanceOnCreate(
  _capabilities: Pick<StudentCreateJourneyCapabilities, 'canAssignFeePlan'>,
): boolean {
  return false;
}

export function canOfferCreateAgreementActivationUi(
  _capabilities: Pick<StudentCreateJourneyCapabilities, 'canAssignFeePlan'>,
  _financeOfferReady: boolean,
): boolean {
  return false;
}
