import { describe, expect, it } from 'vitest';
import { canManageTeachingAssignments } from './academic-setup';
import type { CurrentUser } from '@/types/user';

function actor(overrides: Partial<CurrentUser>): CurrentUser {
  return {
    role: 'admin',
    permissions: [],
    ...overrides,
  } as CurrentUser;
}

describe('teaching assignment management permission', () => {
  it('accepts the independent backend assignment management capability', () => {
    expect(canManageTeachingAssignments(actor({
      effective_capabilities: ['teachers.assignments.manage'],
    }))).toBe(true);
  });

  it('preserves the legacy two-permission grant', () => {
    expect(canManageTeachingAssignments(actor({
      permissions: ['manage_classes', 'manage_teachers'],
    }))).toBe(true);
  });

  it('does not infer management from one legacy permission', () => {
    expect(canManageTeachingAssignments(actor({
      permissions: ['manage_classes'],
    }))).toBe(false);
  });

  it('denies users without assignment management authorization', () => {
    expect(canManageTeachingAssignments(actor({}))).toBe(false);
    expect(canManageTeachingAssignments(null)).toBe(false);
  });
});
