import { describe, expect, it } from 'vitest';
import {
  canManageReferenceSubjects,
  REFERENCE_SUBJECT_MANAGE_CAPABILITY,
} from '@/lib/permissions/academic-capabilities';
import type { CurrentUser } from '@/types/user';

function admin(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'a@test.ma',
    role: 'admin',
    permissions: [],
    school: null,
    admin_kind: 'school_manager',
    ...overrides,
  };
}

describe('canManageReferenceSubjects', () => {
  it('returns true when reference.subject.manage is present', () => {
    const user = admin({
      effective_capabilities: [REFERENCE_SUBJECT_MANAGE_CAPABILITY],
    });
    expect(canManageReferenceSubjects(user)).toBe(true);
  });

  it('returns false for manage_classes alone', () => {
    const user = admin({
      permissions: ['manage_classes'],
      effective_capabilities: ['manage_classes'],
    });
    expect(canManageReferenceSubjects(user)).toBe(false);
  });

  it('returns false for school_manager without the capability', () => {
    const user = admin({
      admin_kind: 'school_manager',
      permissions: ['manage_classes', 'view_classes'],
      is_super_admin: false,
    });
    expect(canManageReferenceSubjects(user)).toBe(false);
  });

  it('does not fall back to admin_kind or is_super_admin', () => {
    expect(
      canManageReferenceSubjects(
        admin({ admin_kind: 'project_manager', is_super_admin: true }),
      ),
    ).toBe(false);
    expect(
      canManageReferenceSubjects(
        admin({ admin_kind: 'super_admin', is_super_admin: true }),
      ),
    ).toBe(false);
  });
});
