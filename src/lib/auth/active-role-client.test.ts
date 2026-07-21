import { beforeEach, describe, expect, it } from 'vitest';
import {
  clientActiveRoleHeaders,
  getClientActiveRole,
  setClientActiveRole,
} from '@/lib/auth/active-role-client';
import { ACTIVE_ROLE_HEADER } from '@/lib/auth/active-role-transport';

describe('active-role client headers', () => {
  beforeEach(() => {
    setClientActiveRole(null);
  });

  it('does not send an empty or unconfirmed header', () => {
    expect(getClientActiveRole()).toBeNull();
    expect(clientActiveRoleHeaders()).toEqual({});
  });

  it('sends X-SSC-Active-Role only for confirmed legal roles', () => {
    setClientActiveRole('teacher');
    expect(getClientActiveRole()).toBe('teacher');
    expect(clientActiveRoleHeaders()).toEqual({ [ACTIVE_ROLE_HEADER]: 'teacher' });

    setClientActiveRole('admin');
    expect(clientActiveRoleHeaders()).toEqual({ [ACTIVE_ROLE_HEADER]: 'admin' });
  });

  it('ignores invalid role codes', () => {
    setClientActiveRole('director');
    expect(getClientActiveRole()).toBeNull();
    expect(clientActiveRoleHeaders()).toEqual({});
  });
});
