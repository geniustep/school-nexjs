import { describe, expect, it } from 'vitest';
import { canManageEdgeSettings } from './edge-settings';
import type { CurrentUser } from '@/types/user';

function user(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: null,
    role: 'admin',
    permissions: [],
    school: { id: 3, name: 'School' },
    active_school_id: 3,
    ...overrides,
  };
}

describe('Raqeem Edge settings permission', () => {
  it('allows an admin with edge.device.manage capability', () => {
    expect(
      canManageEdgeSettings(user({ effective_capabilities: ['edge.device.manage'] })),
    ).toBe(true);
  });

  it('fails closed without the capability', () => {
    expect(canManageEdgeSettings(user())).toBe(false);
  });

  it('rejects non-admin roles even if the capability is present', () => {
    expect(
      canManageEdgeSettings(
        user({ role: 'teacher', effective_capabilities: ['edge.device.manage'] }),
      ),
    ).toBe(false);
  });
});
