import { describe, expect, it } from 'vitest';
import {
  normalizeUndeliverableGuardianRow,
  normalizeUndeliverableGuardianRows,
  undeliverableAccountStatusKey,
  undeliverableGuardiansErrorKey,
  undeliverableHasMore,
} from './undeliverable-guardians-present';

describe('undeliverable-guardians-present', () => {
  it('normalizes guardian rows and strips PII fields', () => {
    const row = normalizeUndeliverableGuardianRow({
      guardian: { id: 1, name: 'ولي', phone: '06', email: 'a@b.c', login: 'x', user_id: 9 },
      students: [
        { id: 2, name: 'تلميذ', class: { id: 3, name: '5B' }, phone: '07' },
        { id: null, name: 'invalid' },
      ],
      reason_code: 'missing_portal_user',
      account_status: 'no_account',
      mobile: '08',
      credentials: 'secret',
    });

    expect(row).toEqual({
      guardian: { id: 1, name: 'ولي' },
      students: [{ id: 2, name: 'تلميذ', class: { id: 3, name: '5B' } }],
      reason_code: 'missing_portal_user',
      account_status: 'no_account',
    });
    expect(JSON.stringify(row)).not.toMatch(/phone|email|login|user_id|mobile|credentials/i);
  });

  it('maps account statuses and error codes', () => {
    expect(undeliverableAccountStatusKey('no_account')).toBe(
      'channels.audience.undeliverable.statuses.noAccount',
    );
    expect(undeliverableAccountStatusKey('inactive')).toBe(
      'channels.audience.undeliverable.statuses.inactive',
    );
    expect(undeliverableAccountStatusKey('guardian_inactive')).toBe(
      'channels.audience.undeliverable.statuses.guardianInactive',
    );
    expect(undeliverableGuardiansErrorKey({ code: 'forbidden', details: { status: 403 } })).toBe(
      'channels.audience.undeliverable.errors.forbidden',
    );
    expect(undeliverableGuardiansErrorKey({ code: 'not_found', details: { status: 404 } })).toBe(
      'channels.audience.undeliverable.errors.notFound',
    );
    expect(
      undeliverableGuardiansErrorKey({ code: 'validation_error', details: { status: 422 } }),
    ).toBe('channels.audience.undeliverable.errors.unsupported');
    expect(undeliverableGuardiansErrorKey({ code: 'network_error', details: {} })).toBe(
      'channels.audience.undeliverable.errors.loadFailed',
    );
  });

  it('detects pagination has-more from meta', () => {
    expect(
      undeliverableHasMore(50, {
        pagination: { page: 1, page_size: 50, total: 80, total_pages: 2 },
      }),
    ).toBe(true);
    expect(
      undeliverableHasMore(80, {
        pagination: { page: 2, page_size: 50, total: 80, total_pages: 2 },
      }),
    ).toBe(false);
    expect(normalizeUndeliverableGuardianRows(null)).toEqual([]);
  });
});
