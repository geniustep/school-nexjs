import { canCreateGuardians } from '@/lib/permissions/academic-capabilities';
import {
  canAssignFees,
  canManageBillingProfile,
  canManageDiscounts,
} from '@/lib/permissions/finance';
import type { CurrentUser } from '@/types/user';

/**
 * UI-facing capability gates for the single-student registration journey.
 * Odoo remains the authority; these only hide/disable actions in Next.js.
 *
 * Source-verified capability names (no inventing):
 * - students.create / manage_students → create student (page gate)
 * - guardians.create / manage_parents → create new guardian
 * - finance.assign_fees → attach / activate fee plan on create
 * - finance.manage_discounts → discount customization
 * - finance.manage_billing_profile → billing responsibility management UX
 *
 * Note: finance.submit_agreements / finance.activate_agreements are NOT in the
 * current Next.js permission catalog; activation is gated by finance.assign_fees.
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
    canAssignFeePlan: canAssignFees(user ?? null),
    canManageDiscounts: canManageDiscounts(user ?? null),
    canManageBillingProfile: canManageBillingProfile(user ?? null),
  };
}

export function shouldForceSkipFinanceOnCreate(
  capabilities: Pick<StudentCreateJourneyCapabilities, 'canAssignFeePlan'>,
): boolean {
  return !capabilities.canAssignFeePlan;
}

export function canOfferCreateAgreementActivationUi(
  capabilities: Pick<StudentCreateJourneyCapabilities, 'canAssignFeePlan'>,
  financeOfferReady: boolean,
): boolean {
  return capabilities.canAssignFeePlan && financeOfferReady;
}
