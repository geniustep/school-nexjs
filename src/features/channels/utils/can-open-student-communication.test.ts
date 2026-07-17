import { describe, expect, it } from 'vitest';
import type { CurrentUser } from '@/types/user';
import { canOpenStudentCommunication } from './can-open-student-communication';

function user(permissions: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'a@test.ma',
    login: 'admin',
    role: 'admin',
    admin_kind: 'admin_staff',
    school: { id: 3, name: 'School' },
    permissions: permissions as CurrentUser['permissions'],
  } as CurrentUser;
}

describe('canOpenStudentCommunication', () => {
  it('allows admins with view_channels and performs no fetch', () => {
    expect(canOpenStudentCommunication(user(['view_channels']))).toBe(true);
  });

  it('denies admins without view_channels', () => {
    expect(canOpenStudentCommunication(user(['view_students']))).toBe(false);
  });

  it('denies null users', () => {
    expect(canOpenStudentCommunication(null)).toBe(false);
  });
});
