import { describe, expect, it } from 'vitest';
import { parseDateInput } from '@/lib/i18n/parse-date-input';
import {
  cashAuditEventLabelKey,
  cashAuditEventReasonText,
  cashAuditEventUserName,
} from '@/lib/utils/cash-audit-events';
import { resolveMovementTimestamps } from '@/lib/utils/cash-movement-audit';
import {
  cashMovementRequiresReference,
  CASH_MOVEMENT_TYPES_REQUIRING_REFERENCE,
} from '@/lib/utils/cash-movement-rules';
import { cashSessionHasCurrency } from '@/lib/utils/cash-session-currency';
import {
  cashSessionErrorMessageKey,
  resolveCashSessionErrorMessage,
} from '@/lib/utils/cash-session-errors';
import { normalizeCashSession } from '@/lib/utils/cash-session-normalize';
import { isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';

describe('cash movement reference rules', () => {
  it('requires reference for bank deposit and outbound transfers', () => {
    expect(CASH_MOVEMENT_TYPES_REQUIRING_REFERENCE).toEqual([
      'bank_deposit',
      'cash_out_adjustment',
      'safe_transfer_out',
    ]);
    expect(cashMovementRequiresReference('bank_deposit')).toBe(true);
    expect(cashMovementRequiresReference('cash_out_adjustment')).toBe(true);
    expect(cashMovementRequiresReference('safe_transfer_out')).toBe(true);
    expect(cashMovementRequiresReference('cash_in_adjustment')).toBe(false);
    expect(cashMovementRequiresReference('safe_transfer_in')).toBe(false);
  });
});

describe('cash session error messages', () => {
  it('maps reference business error by message text', () => {
    expect(
      cashSessionErrorMessageKey('business_error', 'Reference is required for this movement type.'),
    ).toBe('admin.finance.cashDesk.errors.referenceRequired');
  });

  it('resolves translated reference error', () => {
    const msg = resolveCashSessionErrorMessage(
      { code: 'business_error', message: 'Reference is required for this movement type.' },
      (key) => (key === 'admin.finance.cashDesk.errors.referenceRequired' ? 'المرجع إلزامي' : key),
    );
    expect(msg).toBe('المرجع إلزامي');
  });
});

describe('cash audit events', () => {
  it('maps known actions to translation keys', () => {
    expect(cashAuditEventLabelKey('opened')).toBe('admin.finance.cashDesk.timeline.opened');
    expect(cashAuditEventLabelKey('movement_created')).toBe(
      'admin.finance.cashDesk.timeline.movement_created',
    );
    expect(cashAuditEventLabelKey('unknown_code')).toBe('admin.finance.cashDesk.timeline.unknown');
  });

  it('extracts user name without raw ids in label', () => {
    expect(cashAuditEventUserName({ user: 'Administrator' })).toBe('Administrator');
    expect(cashAuditEventUserName({ user: { id: 1, name: 'Done User' } })).toBe('Done User');
    expect(cashAuditEventReasonText(false)).toBeNull();
  });
});

describe('cash session normalize polish', () => {
  it('drops false reference and keeps movement direction', () => {
    const session = normalizeCashSession({
      id: 1,
      state: 'open',
      movements: [
        {
          id: 9,
          movement_type: 'bank_deposit',
          amount: 500,
          direction: 'out',
          reference: false,
          reason: 'test',
        },
      ],
      audit: [{ action: 'opened', event_at: '2026-06-16 17:32:23', user: 'Administrator' }],
    });
    expect(session?.movements?.[0]?.reference).toBeUndefined();
    expect(session?.movements?.[0]?.direction).toBe('out');
    expect(session?.timeline?.[0]?.action).toBe('opened');
  });

  it('uses backend expected balance in summary', () => {
    const session = normalizeCashSession({
      id: 2,
      summary: { expected_balance: 1500, collections_count: 3, receipts_count: 2 },
    });
    expect(session?.summary?.expected_balance).toBe(1500);
    expect(session?.summary?.collections_count).toBe(3);
  });
});

describe('cash session currency display', () => {
  it('hides currency field when absent', () => {
    expect(cashSessionHasCurrency({ id: 1, currency: undefined })).toBe(false);
    expect(cashSessionHasCurrency({ id: 1, currency_code: 'MAD' })).toBe(true);
  });
});

describe('cash desk returnTo visibility', () => {
  it('shows returnTo only for safe internal paths', () => {
    expect(isSafeInternalReturnPath('/admin/finance/collections/new')).toBe(true);
    expect(isSafeInternalReturnPath('/admin/finance/cash-desk')).toBe(true);
    expect(isSafeInternalReturnPath(null)).toBe(false);
  });

  it('hides returnTo when user opens desk directly (no query param)', () => {
    const rawReturnTo = null;
    const returnTo = isSafeInternalReturnPath(rawReturnTo) ? rawReturnTo : null;
    expect(returnTo).toBeNull();
  });
});

describe('odoo datetime parsing', () => {
  it('parses Odoo event_at strings', () => {
    const parsed = parseDateInput('2026-06-16 17:33:29');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(5);
    expect(parsed?.getDate()).toBe(16);
  });
});

describe('movement timestamps from audit', () => {
  it('maps movement rows to movement_created audit timestamps', () => {
    const map = resolveMovementTimestamps(
      [
        { id: 9, reason: 'عميل 1' },
        { id: 10, reason: 'probe ref test' },
      ],
      [
        { action: 'movement_created', at: '2026-06-16 17:33:29', reason: 'عميل 1' },
        { action: 'movement_created', at: '2026-06-16 17:38:12', reason: 'probe ref test' },
      ],
    );
    expect(map.get(9)).toBe('2026-06-16 17:33:29');
    expect(map.get(10)).toBe('2026-06-16 17:38:12');
  });
});
