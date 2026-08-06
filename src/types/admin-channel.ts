/**
 * Admin communication channel lifecycle contract (Odoo Runtime 18.0.1.0.254 /
 * source commit 1b6f9b62e10b7976a8d1b4faac0c39f42415cd9a).
 *
 * Serialization: fmt_admin_channel — additive over portal fmt_channel.
 * Opt-in: include_family_audience=1 → family_audience_summary on class_family.
 * Permissions: Backend-owned boolean maps only; never invent local can* flags.
 */

import type { Channel, ChannelType } from './channel';
import type { ApiMeta, Ref } from './api';

/** Manual create types accepted by api_create_manual_channel. */
export const ADMIN_MANUAL_CHANNEL_TYPES = [
  'public',
  'class',
  'teachers',
  'parents',
  'announcement',
  'private',
] as const;

/** System class channel types accepted by api_ensure_system_class_channel. */
export const ADMIN_SYSTEM_CHANNEL_TYPES = ['class_staff', 'class_family'] as const;

export type AdminManualChannelType = (typeof ADMIN_MANUAL_CHANNEL_TYPES)[number];
export type AdminSystemChannelType = (typeof ADMIN_SYSTEM_CHANNEL_TYPES)[number];
export type AdminCreatableChannelType = AdminManualChannelType | AdminSystemChannelType;

export type AdminChannelType = ChannelType | AdminSystemChannelType | (string & {});

export type AdminChannelLifecycleAction =
  | 'view'
  | 'send_message'
  | 'update'
  | 'delete'
  | 'archive'
  | 'restore';

/** Boolean map from get_lifecycle_allowed_actions. */
export type AdminChannelAllowedActions = Partial<
  Record<AdminChannelLifecycleAction, boolean>
> & {
  [key: string]: boolean | undefined;
};

export type AdminChannelListAllowedActions = {
  create_channel?: boolean;
  [key: string]: boolean | undefined;
};

export type AdminChannelListMeta = ApiMeta & {
  allowed_actions?: AdminChannelListAllowedActions | null;
};

export type ChannelBlockingReason = {
  code: string;
  message?: string | null;
  count?: number | null;
  [key: string]: unknown;
};

export type AdminChannelHistoryUsage = {
  school_message?: number;
  communication_content?: number;
  content_version?: number;
  recipient_snapshot?: number;
  reply?: number;
  attachment?: number;
  mail_message_chatter?: number;
  [key: string]: number | undefined;
};

export type AdminChannelMemberSummary = {
  member_count?: number | null;
  external_member_count?: number | null;
};

/** Opt-in family audience delivery state (Odoo include_family_audience=1). */
export type FamilyAudienceDeliveryState =
  | 'ready'
  | 'partial'
  | 'unavailable'
  | 'empty_class';

export type FamilyAudienceExclusionLine = {
  code: string;
  count?: number | null;
  message?: string | null;
};

export type FamilyAudienceSummary = {
  resolution_source?: string | null;
  student_count: number;
  guardian_count: number;
  deliverable_user_count: number;
  excluded_count: number;
  delivery_state: FamilyAudienceDeliveryState;
  exclusion_summary: FamilyAudienceExclusionLine[];
};

/**
 * Admin list/detail row. Keeps portal Channel fields (`type`, `can_send`, …)
 * and adds lifecycle fields from fmt_admin_channel.
 */
export type AdminChannel = Channel & {
  channel_type?: AdminChannelType | null;
  school_id?: number | null;
  school?: Ref | null;
  academic_year?: Ref | null;
  class?: Ref | null;
  is_system_managed?: boolean | null;
  is_archived?: boolean | null;
  allow_attachments?: boolean | null;
  notify_email?: boolean | null;
  member_summary?: AdminChannelMemberSummary | null;
  /** Present when list/detail requested with include_family_audience=1. */
  family_audience_summary?: FamilyAudienceSummary | null;
  has_history?: boolean | null;
  history_usage?: AdminChannelHistoryUsage | null;
  allowed_actions?: AdminChannelAllowedActions | null;
  blocking_reasons?: ChannelBlockingReason[] | null;
};

export type CreateAdminChannelInput = {
  name: string;
  description?: string | null;
  channel_type: AdminCreatableChannelType;
  class_id?: number;
  read_only?: boolean;
  allow_attachments?: boolean;
  notify_email?: boolean;
};

export type UpdateAdminChannelInput = {
  name?: string;
  description?: string | null;
  read_only?: boolean;
  allow_attachments?: boolean;
  notify_email?: boolean;
};

export type DeleteAdminChannelResult = {
  action: 'deleted' | string;
  id: number;
  channel?: {
    id?: number;
    name?: string | null;
    channel_type?: string | null;
    is_system_managed?: boolean | null;
  } | null;
};

export type ChannelLifecycleError = {
  code: string;
  message: string;
  status?: number;
  blocking_reasons?: ChannelBlockingReason[];
  allowed_actions?: AdminChannelAllowedActions | null;
  channel?: AdminChannel | null;
  history_usage?: AdminChannelHistoryUsage | null;
};
