import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type {
  ChannelRecipientCandidate,
  ChannelRecipientCandidatesPayload,
} from '@/types/channel-recipient-candidates';

export type FetchChannelRecipientCandidatesResult =
  | { ok: true; data: ChannelRecipientCandidatesPayload }
  | { ok: false; error: ApiErrorBody };

function asNonNegativeInt(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }
  return fallback;
}

function normalizeCandidate(raw: unknown): ChannelRecipientCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'number' || !Number.isInteger(row.id) || row.id <= 0) return null;
  if (typeof row.name !== 'string') return null;
  return {
    id: row.id,
    name: row.name,
    type: typeof row.type === 'string' ? row.type : 'private',
    member_count: asNonNegativeInt(row.member_count),
    family_recipient_count: asNonNegativeInt(row.family_recipient_count),
    can_send: row.can_send === true,
  };
}

/** Normalize and drop unexpected membership/PII fields from the envelope. */
export function normalizeChannelRecipientCandidatesPayload(
  raw: unknown,
): ChannelRecipientCandidatesPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.student_id !== 'number' || !Number.isInteger(data.student_id) || data.student_id <= 0) {
    return null;
  }

  const channelsRaw = Array.isArray(data.channels) ? data.channels : [];
  const channels = channelsRaw
    .map(normalizeCandidate)
    .filter((c): c is ChannelRecipientCandidate => c != null);

  return {
    student_id: data.student_id,
    recipient_kind: typeof data.recipient_kind === 'string' ? data.recipient_kind : 'family',
    linked_guardian_user_count: asNonNegativeInt(data.linked_guardian_user_count),
    channel_count: asNonNegativeInt(data.channel_count, channels.length),
    reason: typeof data.reason === 'string' || data.reason === null ? data.reason : null,
    channels,
  };
}

export function buildRecipientCandidatesQuery(studentId: number): { student_id: number } {
  return { student_id: studentId };
}

export async function fetchChannelRecipientCandidates(
  studentId: number,
): Promise<FetchChannelRecipientCandidatesResult> {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return {
      ok: false,
      error: {
        code: 'validation_error',
        message: 'student_id must be a positive integer.',
      },
    };
  }

  const res = await api.get<unknown>(
    endpoints.admin.channelRecipientCandidates,
    buildRecipientCandidatesQuery(studentId),
  );

  if (!res.success) {
    return { ok: false, error: res.error };
  }

  const data = normalizeChannelRecipientCandidatesPayload(res.data);
  if (!data) {
    return {
      ok: false,
      error: {
        code: 'server_error',
        message: 'Unexpected recipient-candidates response shape.',
      },
    };
  }

  return { ok: true, data };
}
