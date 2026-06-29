import { describe, expect, it } from 'vitest';
import {
  cashSessionAllowsAction,
  normalizeCashSession,
  normalizeCurrentCashSession,
  parseCashSessionList,
  previewCashDifference,
} from '@/lib/utils/cash-session-normalize';

describe('cash session normalize', () => {
  it('normalizes current session wrapper', () => {
    expect(normalizeCurrentCashSession({ session: null })).toBeNull();
    const session = normalizeCurrentCashSession({
      session: { id: 5, state: 'open', opening_balance: 100, allowed_actions: ['view'] },
    });
    expect(session?.id).toBe(5);
    expect(session?.opening_balance).toBe(100);
  });

  it('parses list with pagination meta', () => {
    const result = parseCashSessionList([], {
      pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 },
    });
    expect(result.items).toEqual([]);
    expect(result.pagination?.total).toBe(0);
  });

  it('uses summary expected balance from API', () => {
    const session = normalizeCashSession({
      id: 1,
      state: 'open',
      summary: {
        opening_balance: 50,
        expected_balance: 250,
        cash_collections_total: 200,
      },
    });
    expect(session?.summary?.expected_balance).toBe(250);
    expect(session?.expected_balance).toBe(250);
  });

  it('respects allowed_actions', () => {
    const session = normalizeCashSession({
      id: 1,
      allowed_actions: ['start_closing', 'add_movement'],
    });
    expect(cashSessionAllowsAction(session, 'add_movement')).toBe(true);
    expect(cashSessionAllowsAction(session, 'close')).toBe(false);
  });

  it('normalizes allowed_actions map and session_id alias', () => {
    const session = normalizeCashSession({
      session_id: 9,
      state: 'open',
      cashier_id: 8,
      cashier_name: 'bouchra',
      allowed_actions: { view: true, add_cash_collection: true, close: false },
    });
    expect(session?.id).toBe(9);
    expect(session?.cashier_id).toBe(8);
    expect(cashSessionAllowsAction(session, 'add_cash_collection')).toBe(true);
    expect(cashSessionAllowsAction(session, 'close')).toBe(false);
  });

  it('normalizes shared current session wrapper for another cashier', () => {
    const session = normalizeCurrentCashSession({
      session: {
        id: 1,
        state: 'open',
        cashier_id: 8,
        cashier_name: 'bouchra',
        allowed_actions: ['view', 'add_cash_collection'],
      },
    });
    expect(session?.cashier_id).toBe(8);
    expect(cashSessionAllowsAction(session, 'add_cash_collection')).toBe(true);
  });

  it('previews counted difference only for UI', () => {
    expect(previewCashDifference(120, 100)).toBe(20);
    expect(previewCashDifference(90, 100)).toBe(-10);
    expect(previewCashDifference(null, 100)).toBeNull();
  });

  it('unwraps nested session payloads and live API fields', () => {
    const session = normalizeCashSession({
      movement: { id: 5 },
      session: {
        id: 149,
        name: 'CSH/raqeem/000003',
        state: 'closed',
        opening_balance: 100,
        expected_balance: 150,
        counted_balance: 150,
        difference_amount: 0,
        journal_name: 'نقدي',
        movements_summary: { in_total: 50, out_total: 0 },
        audit: [{ action: 'opened', event_at: '2026-06-16 15:47:42', user: 'Administrator' }],
      },
    });
    expect(session?.id).toBe(149);
    expect(session?.difference).toBe(0);
    expect(session?.summary?.movements_in_total).toBe(50);
    expect(session?.timeline?.[0]?.at).toBe('2026-06-16 15:47:42');
  });
});
