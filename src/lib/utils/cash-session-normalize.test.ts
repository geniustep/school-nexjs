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

  it('previews counted difference only for UI', () => {
    expect(previewCashDifference(120, 100)).toBe(20);
    expect(previewCashDifference(90, 100)).toBe(-10);
    expect(previewCashDifference(null, 100)).toBeNull();
  });
});
