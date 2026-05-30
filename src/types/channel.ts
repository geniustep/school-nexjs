// Channel resources — mirrors API_REPORT.md §3, §10.

export type ChannelType =
  | 'public'
  | 'class'
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
  unread_count: number;
  member_count: number;
  last_message_date: string | null;
}
