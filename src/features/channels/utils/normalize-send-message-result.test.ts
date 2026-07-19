import { describe, expect, it } from 'vitest';
import {
  classifySendChannelMessageResult,
  isPendingMessageSubmitResult,
  mergePublishedMessages,
  normalizePendingMessageSubmitResult,
  normalizePublishedMessage,
} from './normalize-send-message-result';

describe('normalize-send-message-result', () => {
  it('classifies HTTP 202 pending_review as pending and extracts communication_content_id', () => {
    const data = {
      pending_review: true,
      communication_content_id: 34,
      channel_id: 10,
      communication_state: 'submitted',
      state: 'submitted',
      message: 'submitted for review',
    };
    expect(isPendingMessageSubmitResult(data)).toBe(true);
    const outcome = classifySendChannelMessageResult(data, 202);
    expect(outcome?.kind).toBe('pending');
    if (outcome?.kind === 'pending') {
      expect(outcome.pending.communication_content_id).toBe(34);
      expect(outcome.httpStatus).toBe(202);
    }
    expect(normalizePublishedMessage(data)).toBeNull();
  });

  it('classifies HTTP 201 direct message as published', () => {
    const data = {
      id: 6,
      channel_id: 9,
      sender: { id: 2, name: 'Administrator', role: 'admin' },
      body: 'hello staff',
      body_html: '<p>hello staff</p>',
      is_pinned: false,
      is_important: false,
      created_at: '2026-07-18T21:09:05',
      direction: 'internal_staff',
    };
    const outcome = classifySendChannelMessageResult(data, 201);
    expect(outcome?.kind).toBe('published');
    if (outcome?.kind === 'published') {
      expect(outcome.message.id).toBe(6);
      expect(outcome.message.channel_id).toBe(9);
    }
    expect(isPendingMessageSubmitResult(data)).toBe(false);
  });

  it('does not treat communication_content_id as Message id', () => {
    const pending = normalizePendingMessageSubmitResult({
      pending_review: true,
      communication_content_id: 99,
      channel_id: 10,
      id: 99,
    });
    expect(pending?.communication_content_id).toBe(99);
    expect(normalizePublishedMessage({
      pending_review: true,
      communication_content_id: 99,
      channel_id: 10,
      id: 99,
    })).toBeNull();
  });

  it('does not treat HTTP 202 as a failure classification path', () => {
    const outcome = classifySendChannelMessageResult(
      {
        pending_review: true,
        communication_content_id: 1,
        channel_id: 2,
      },
      202,
    );
    expect(outcome).not.toBeNull();
    expect(outcome?.kind).toBe('pending');
  });

  it('preserves B4 recipient_summary and snapshot fields on pending submit', () => {
    const pending = normalizePendingMessageSubmitResult({
      pending_review: true,
      communication_content_id: 34,
      channel_id: 10,
      snapshot_id: 9,
      snapshot_fingerprint: 'abcd',
      version_id: 2,
      audience_changed: true,
      recipient_summary: {
        total_people_count: 0,
        is_frozen: true,
        can_submit: true,
        snapshot_id: 9,
      },
      allowed_actions: ['cancel'],
    });
    expect(pending?.snapshot_id).toBe(9);
    expect(pending?.snapshot_fingerprint).toBe('abcd');
    expect(pending?.version_id).toBe(2);
    expect(pending?.audience_changed).toBe(true);
    expect(pending?.recipient_summary?.total_people_count).toBe(0);
    expect(pending?.recipient_summary?.is_frozen).toBe(true);
    expect(pending?.communication_content_id).toBe(34);
  });

  it('deduplicates published messages by Message id after refetch', () => {
    const a = {
      id: 7,
      channel_id: 10,
      sender: { id: 1, name: 'A', role: 'admin' },
      body: 'one',
      body_html: 'one',
      is_pinned: false,
      is_important: false,
      created_at: '2026-07-18T10:00:00',
    };
    const b = { ...a, body: 'one updated' };
    const merged = mergePublishedMessages([a], [b]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.body).toBe('one updated');
  });
});
