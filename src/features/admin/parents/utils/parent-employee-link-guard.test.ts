import { describe, expect, it } from 'vitest';
import { canLinkPersonAsGuardian } from '@/features/admin/students/utils/guardian-profile-contract';
import type { PersonSearchResult } from '@/types/student-360';

function person(overrides: Partial<PersonSearchResult>): PersonSearchResult {
  return {
    partner_id: 1,
    id: 1,
    name: 'Test',
    existing_roles: [],
    role_labels: [],
    has_user_account: false,
    can_link_as_guardian: true,
    ...overrides,
  };
}

describe('canLinkPersonAsGuardian for parent employee link', () => {
  it('blocks link when can_link_as_guardian is false', () => {
    expect(
      canLinkPersonAsGuardian(
        person({ can_link_as_guardian: false, allowed_actions: { link_as_guardian: false } }),
        false,
      ),
    ).toBe(false);
  });

  it('allows link when backend permits', () => {
    expect(canLinkPersonAsGuardian(person({ can_link_as_guardian: true }), false)).toBe(true);
  });

  it('blocks archived persons', () => {
    expect(canLinkPersonAsGuardian(person({ archived: true, status: 'archived' }), false)).toBe(
      false,
    );
  });
});
