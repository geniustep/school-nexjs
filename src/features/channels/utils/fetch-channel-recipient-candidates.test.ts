import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildRecipientCandidatesQuery,
  fetchChannelRecipientCandidates,
  normalizeChannelRecipientCandidatesPayload,
} from './fetch-channel-recipient-candidates';

const getMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/api/endpoints', () => ({
  endpoints: {
    admin: {
      channelRecipientCandidates: '/admin/channels/recipient-candidates',
    },
  },
}));

describe('buildRecipientCandidatesQuery', () => {
  it('maps frontend studentId to backend student_id', () => {
    expect(buildRecipientCandidatesQuery(2081)).toEqual({ student_id: 2081 });
  });
});

describe('normalizeChannelRecipientCandidatesPayload', () => {
  it('keeps contract fields and drops membership/PII extras', () => {
    const normalized = normalizeChannelRecipientCandidatesPayload({
      student_id: 2081,
      recipient_kind: 'family',
      linked_guardian_user_count: 1,
      channel_count: 1,
      reason: null,
      channels: [
        {
          id: 11,
          name: 'Family Alami',
          type: 'private',
          member_count: 2,
          family_recipient_count: 1,
          can_send: true,
          member_ids: [1, 2],
          guardian_user_id: 99,
          phone: '0600000000',
        },
      ],
      member_ids: [1, 2],
    });

    expect(normalized).toEqual({
      student_id: 2081,
      recipient_kind: 'family',
      linked_guardian_user_count: 1,
      channel_count: 1,
      reason: null,
      channels: [
        {
          id: 11,
          name: 'Family Alami',
          type: 'private',
          member_count: 2,
          family_recipient_count: 1,
          can_send: true,
        },
      ],
    });
    expect(JSON.stringify(normalized)).not.toContain('member_ids');
    expect(JSON.stringify(normalized)).not.toContain('0600000000');
  });
});

describe('fetchChannelRecipientCandidates', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('uses GET with student_id and no body', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: {
        student_id: 2081,
        recipient_kind: 'family',
        linked_guardian_user_count: 1,
        channel_count: 0,
        reason: 'no_related_channels',
        channels: [],
      },
      meta: {},
    });

    const result = await fetchChannelRecipientCandidates(2081);
    expect(result.ok).toBe(true);
    expect(getMock).toHaveBeenCalledWith('/admin/channels/recipient-candidates', {
      student_id: 2081,
    });
  });

  it('does not call API for invalid local student id', async () => {
    const result = await fetchChannelRecipientCandidates(0);
    expect(result.ok).toBe(false);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('normalizes 404 errors', async () => {
    getMock.mockResolvedValue({
      success: false,
      error: { code: 'not_found', message: 'Student not found.', details: { status: 404 } },
      meta: {},
    });
    const result = await fetchChannelRecipientCandidates(999);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
      expect(result.error.details?.status).toBe(404);
    }
  });
});
