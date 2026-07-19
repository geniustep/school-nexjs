import { describe, expect, it } from 'vitest';
import {
  normalizeCommunicationSubmitResult,
  normalizeOptionalBoolean,
  normalizeRecipientCount,
  normalizeRecipientPreviewResponse,
  normalizeRecipientSummary,
  shortSnapshotFingerprint,
} from './normalize-recipient-summary';

describe('normalizeRecipientCount', () => {
  it('preserves zero', () => {
    expect(normalizeRecipientCount(0)).toBe(0);
    expect(normalizeRecipientCount('0')).toBe(0);
  });

  it('accepts finite numbers and numeric strings', () => {
    expect(normalizeRecipientCount(12)).toBe(12);
    expect(normalizeRecipientCount('7')).toBe(7);
  });

  it('rejects NaN and non-numeric', () => {
    expect(normalizeRecipientCount(Number.NaN)).toBeUndefined();
    expect(normalizeRecipientCount('abc')).toBeUndefined();
    expect(normalizeRecipientCount(undefined)).toBeUndefined();
  });

  it('clamps negatives to zero', () => {
    expect(normalizeRecipientCount(-3)).toBe(0);
  });
});

describe('normalizeOptionalBoolean', () => {
  it('keeps true/false and leaves missing undefined', () => {
    expect(normalizeOptionalBoolean(true)).toBe(true);
    expect(normalizeOptionalBoolean(false)).toBe(false);
    expect(normalizeOptionalBoolean(undefined)).toBeUndefined();
    expect(normalizeOptionalBoolean(null)).toBeUndefined();
  });
});

describe('normalizeRecipientSummary', () => {
  it('normalizes a full summary without inventing totals', () => {
    const summary = normalizeRecipientSummary({
      resolution_state: 'resolved',
      snapshot_id: 9,
      snapshot_fingerprint: 'abc123def456',
      is_frozen: true,
      resolved_at: '2026-07-19T00:00:00Z',
      total_people_count: 10,
      deliverable_user_count: 8,
      student_count: 4,
      guardian_count: 5,
      staff_count: 1,
      excluded_count: 2,
      audience_labels: ['قسم أ'],
      exclusion_summary: [{ code: 'no_portal', reason: 'لا حساب', count: 2 }],
      source_type: 'channel_message',
      source_id: 55,
      school_id: 1,
      version_id: 3,
      audience_changed: false,
      can_submit: true,
      blocking_reasons: [],
      email: 'should-ignore@example.com',
      phone: '0600000000',
    });
    expect(summary).toMatchObject({
      total_people_count: 10,
      deliverable_user_count: 8,
      student_count: 4,
      guardian_count: 5,
      staff_count: 1,
      excluded_count: 2,
      is_frozen: true,
      can_submit: true,
      snapshot_id: 9,
    });
    expect(summary).not.toHaveProperty('email');
    expect(summary).not.toHaveProperty('phone');
    // Must not equalize deliverable and total locally
    expect(summary?.deliverable_user_count).not.toBe(summary?.total_people_count);
  });

  it('accepts partial summary and zero counts', () => {
    const summary = normalizeRecipientSummary({
      total_people_count: 0,
      student_count: 0,
      can_submit: false,
      blocking_reasons: ['audience_empty'],
    });
    expect(summary?.total_people_count).toBe(0);
    expect(summary?.student_count).toBe(0);
    expect(summary?.can_submit).toBe(false);
    expect(summary?.blocking_reasons).toEqual(['audience_empty']);
    expect(summary?.guardian_count).toBeUndefined();
  });

  it('does not mix snapshot id with content/message ids from unrelated fields', () => {
    const summary = normalizeRecipientSummary({
      snapshot_id: 11,
      communication_content_id: 99,
      message_id: 77,
      id: 77,
    });
    expect(summary?.snapshot_id).toBe(11);
    expect(summary).not.toHaveProperty('communication_content_id');
    expect(summary).not.toHaveProperty('message_id');
  });

  it('returns null for non-objects', () => {
    expect(normalizeRecipientSummary(null)).toBeNull();
    expect(normalizeRecipientSummary('x')).toBeNull();
  });
});

describe('normalizeRecipientPreviewResponse', () => {
  it('marks presentation as preview and keeps nested summary', () => {
    const preview = normalizeRecipientPreviewResponse({
      recipient_summary: {
        total_people_count: 3,
        can_submit: true,
        is_frozen: false,
      },
    });
    expect(preview?.presentation).toBe('preview');
    expect(preview?.recipient_summary.total_people_count).toBe(3);
  });

  it('accepts top-level summary shape', () => {
    const preview = normalizeRecipientPreviewResponse({
      total_people_count: 2,
      deliverable_user_count: 2,
    });
    expect(preview?.recipient_summary.total_people_count).toBe(2);
    expect(preview?.presentation).toBe('preview');
  });
});

describe('normalizeCommunicationSubmitResult', () => {
  it('keeps frozen submit fields', () => {
    const result = normalizeCommunicationSubmitResult({
      pending_review: true,
      communication_content_id: 34,
      communication_state: 'submitted',
      snapshot_id: 12,
      snapshot_fingerprint: 'deadbeef',
      version_id: 4,
      recipient_summary: {
        total_people_count: 5,
        is_frozen: true,
        snapshot_id: 12,
      },
      allowed_actions: ['cancel'],
    });
    expect(result?.communication_content_id).toBe(34);
    expect(result?.snapshot_id).toBe(12);
    expect(result?.recipient_summary?.is_frozen).toBe(true);
    expect(result?.allowed_actions).toEqual(['cancel']);
  });
});

describe('shortSnapshotFingerprint', () => {
  it('truncates long fingerprints', () => {
    expect(shortSnapshotFingerprint('abcdefghijklmnop', 8)).toBe('abcdefgh…');
    expect(shortSnapshotFingerprint('short')).toBe('short');
    expect(shortSnapshotFingerprint(null)).toBeNull();
  });
});
