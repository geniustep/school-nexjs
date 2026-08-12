// Channel resources — mirrors School API channel list/detail.
// Admin lifecycle fields live in admin-channel.ts (Odoo 18.0.1.0.253).

import type { ChannelMessageAction } from './communication';

export type ChannelType =
  | 'public'
  | 'class'
  | 'class_staff'
  | 'class_family'
  | 'teachers'
  | 'parents'
  | 'announcement'
  | 'private';

export interface Channel {
  id: number;
  name: string;
  type: ChannelType;
  description: string | null;
  audience: string | null;
  read_only: boolean;
  // Authoritative server-side flag. The UI must hide the composer when false.
  can_send: boolean;
  /** Present when Backend exposes publish capability on the channel. */
  can_publish?: boolean;
  requires_message_moderation?: boolean;
  is_internal_staff_only?: boolean;
  allow_attachments?: boolean | null;
  external_member_count?: number;
  /** Backend-driven composer actions (e.g. send_internal, submit_message). */
  allowed_message_actions?: ChannelMessageAction[];
  unread_count: number;
  member_count: number;
  last_message_date: string | null;
}
