import { describe, expect, it } from 'vitest';
import type { CurrentUser } from '@/types/user';
import type { Permission } from '@/types/permissions';
import {
  canOfferCreateAgreementActivationUi,
  resolveStudentCreateJourneyCapabilities,
  shouldForceSkipFinanceOnCreate,
} from './student-create-journey-rbac';

function staff(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Staff',
    email: 's@test.ma',
    role: 'admin',
    permissions: [],
    school: null,
    ...overrides,
  };
}

describe('student-create-journey-rbac', () => {
  it('treats Base Plan finance as a full-registration invariant', () => {
    const caps = resolveStudentCreateJourneyCapabilities(
      staff({ effective_capabilities: ['students.create', 'guardians.create'] }),
    );
    expect(caps.canAssignFeePlan).toBe(true);
    expect(caps.canManageDiscounts).toBe(false);
    expect(shouldForceSkipFinanceOnCreate(caps)).toBe(false);
    expect(canOfferCreateAgreementActivationUi(caps, true)).toBe(false);
  });

  it('keeps Base Plan automatic even when legacy finance permissions are present', () => {
    const caps = resolveStudentCreateJourneyCapabilities(
      staff({
        permissions: [
          'finance.assign_fees' as Permission,
          'finance.manage_discounts' as Permission,
        ],
        effective_permissions: [
          'finance.assign_fees' as Permission,
          'finance.manage_discounts' as Permission,
        ],
      }),
    );
    expect(caps.canAssignFeePlan).toBe(true);
    expect(caps.canManageDiscounts).toBe(false);
    expect(shouldForceSkipFinanceOnCreate(caps)).toBe(false);
    expect(canOfferCreateAgreementActivationUi(caps, true)).toBe(false);
  });

  it('blocks new guardian creation without guardians.create / manage_parents', () => {
    const caps = resolveStudentCreateJourneyCapabilities(
      staff({ effective_capabilities: ['students.create'] }),
    );
    expect(caps.canCreateNewGuardian).toBe(false);
  });

  it('allows new guardian with guardians.create', () => {
    const caps = resolveStudentCreateJourneyCapabilities(
      staff({ effective_capabilities: ['guardians.create'] }),
    );
    expect(caps.canCreateNewGuardian).toBe(true);
  });
});
