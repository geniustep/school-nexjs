import { describe, expect, it } from 'vitest';
import {
  normalizeUndeliverableGuardianRow,
  normalizeUndeliverableGuardianRows,
  normalizeUndeliverableGuardiansPayload,
  undeliverableAccountStatusKey,
  undeliverableGuardiansErrorKey,
  undeliverableHasMore,
  undeliverableRowsFromPayload,
} from './undeliverable-guardians-present';

const livePayload = {
  channel_id: 31,
  channel_type: 'class_family',
  school_id: 3,
  total: 2,
  rows: [
    {
      guardian: {
        id: 1,
        name: 'ولي أ',
        phone: '0611111111',
        email: 'a@example.com',
        login: 'parent_a',
        user_id: 101,
      },
      students: [
        {
          id: 10,
          name: 'تلميذ أ',
          class: { id: 5, name: '4A' },
          mobile: '0622222222',
        },
      ],
      reason_code: 'missing_portal_user',
      account_status: 'no_account',
      token: 'secret',
    },
    {
      guardian: { id: 2, name: 'ولي ب' },
      students: [{ id: 11, name: 'تلميذ ب', class: { id: 5, name: '4A' } }],
      reason_code: 'inactive_user',
      account_status: 'inactive',
    },
  ],
  consistency: {
    excluded_count: 38,
    undeliverable_guardian_line_count: 2,
    undeliverable_guardian_count: 2,
    delivery_state: 'partial',
    resolution_source: 'class_family',
  },
  allowed_actions: {
    view_undeliverable_guardians: true,
  },
};

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

  it('consumes live Odoo payload from data.rows (never treats data as array)', () => {
    const normalized = normalizeUndeliverableGuardiansPayload(livePayload);
    expect(normalized.channel_id).toBe(31);
    expect(normalized.total).toBe(2);
    expect(normalized.consistency?.undeliverable_guardian_count).toBe(2);
    expect(normalized.consistency?.excluded_count).toBe(38);
    expect(normalized.rows).toHaveLength(2);
    expect(normalized.rows[0]).toEqual({
      guardian: { id: 1, name: 'ولي أ' },
      students: [{ id: 10, name: 'تلميذ أ', class: { id: 5, name: '4A' } }],
      reason_code: 'missing_portal_user',
      account_status: 'no_account',
    });
    expect(JSON.stringify(normalized.rows)).not.toMatch(
      /phone|email|login|user_id|mobile|token/i,
    );

    // Passing the whole payload object to the row-array normalizer must stay empty.
    expect(normalizeUndeliverableGuardianRows(livePayload)).toEqual([]);
    expect(undeliverableRowsFromPayload(livePayload)).toHaveLength(2);
    expect(undeliverableRowsFromPayload(null)).toEqual([]);
    expect(undeliverableRowsFromPayload({ rows: null })).toEqual([]);
    expect(undeliverableRowsFromPayload({ rows: [{ guardian: null }] })).toEqual([]);
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

  it('detects has-more from flat Runtime 256 meta and nested pagination', () => {
    expect(undeliverableHasMore(1, { page: 1, page_size: 50, total: 2 })).toBe(true);
    expect(undeliverableHasMore(2, { page: 1, page_size: 50, total: 2 })).toBe(false);
    expect(undeliverableHasMore(50, { page: 1, page_size: 50, total: 80 })).toBe(true);
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
    expect(undeliverableHasMore(10, null)).toBe(false);
    expect(undeliverableHasMore(10, {})).toBe(false);
    expect(normalizeUndeliverableGuardianRows(null)).toEqual([]);
  });
});
