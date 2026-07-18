/**
 * GET /admin/channels/recipient-candidates?student_id=<id>
 * Safe family-channel candidates for student communication compose.
 * Does not expose member_ids, guardian user IDs, or PII.
 */

import type { ChannelType } from './channel';

export type ChannelRecipientCandidatesReason =
  | 'no_linked_guardian_users'
  | 'no_related_channels'
  | 'no_safe_family_channel'
  | string
  | null;

export type ChannelRecipientKind = 'family' | string;

export interface ChannelRecipientCandidate {
  id: number;
  name: string;
  type: ChannelType | string;
  member_count: number;
  family_recipient_count: number;
  can_send: boolean;
}

export interface ChannelRecipientCandidatesPayload {
  student_id: number;
  recipient_kind: ChannelRecipientKind;
  linked_guardian_user_count: number;
  channel_count: number;
  reason: ChannelRecipientCandidatesReason;
  channels: ChannelRecipientCandidate[];
}
