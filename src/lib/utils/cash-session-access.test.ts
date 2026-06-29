import { describe, expect, it } from 'vitest';
import {
  cashSessionCashierId,
  cashSessionCashierName,
  cashSessionOwnedByUser,
  collectionBlockedByCashSession,
  resolveCashSessionCollectionAccess,
} from '@/lib/utils/cash-session-access';
import type { CashSession } from '@/types/finance-cash-desk';

const openSession = (overrides: Partial<CashSession> = {}): CashSession => ({
  id: 1,
  state: 'open',
  cashier_id: 8,
  cashier_name: 'bouchra',
  allowed_actions: ['view', 'add_cash_collection'],
  ...overrides,
});

describe('cash session access', () => {
  it('reads cashier id from cashier_id or cashier ref', () => {
    expect(cashSessionCashierId(openSession())).toBe(8);
    expect(cashSessionCashierId({ id: 1, cashier: { id: 12, name: 'Sara' } })).toBe(12);
  });

  it('detects ownership by current user id', () => {
    expect(cashSessionOwnedByUser(openSession(), 8)).toBe(true);
    expect(cashSessionOwnedByUser(openSession(), 5)).toBe(false);
  });

  it('allows collection for own active session', () => {
    const access = resolveCashSessionCollectionAccess({
      requiresSession: true,
      checking: false,
      session: openSession({ cashier_id: 5 }),
      currentUserId: 5,
    });
    expect(access.kind).toBe('allowed');
    if (access.kind === 'allowed') {
      expect(access.shared).toBe(false);
      expect(collectionBlockedByCashSession(access)).toBe(false);
    }
  });

  it('allows collection for another user session when add_cash_collection is allowed', () => {
    const access = resolveCashSessionCollectionAccess({
      requiresSession: true,
      checking: false,
      session: openSession(),
      currentUserId: 5,
    });
    expect(access.kind).toBe('allowed');
    if (access.kind === 'allowed') {
      expect(access.shared).toBe(true);
      expect(access.cashierName).toBe('bouchra');
      expect(collectionBlockedByCashSession(access)).toBe(false);
    }
  });

  it('blocks collection without add_cash_collection permission', () => {
    const access = resolveCashSessionCollectionAccess({
      requiresSession: true,
      checking: false,
      session: openSession({ allowed_actions: ['view'] }),
      currentUserId: 5,
    });
    expect(access.kind).toBe('blocked_no_permission');
    expect(collectionBlockedByCashSession(access)).toBe(true);
  });

  it('requires a session when cash collection needs one', () => {
    const access = resolveCashSessionCollectionAccess({
      requiresSession: true,
      checking: false,
      session: null,
      currentUserId: 5,
    });
    expect(access.kind).toBe('missing_session');
    expect(collectionBlockedByCashSession(access)).toBe(true);
  });

  it('resolves cashier display name', () => {
    expect(cashSessionCashierName(openSession())).toBe('bouchra');
    expect(cashSessionCashierName({ id: 1, cashier: { id: 2, name: 'Sara' } })).toBe('Sara');
  });
});
