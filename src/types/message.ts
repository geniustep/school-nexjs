// Message resources — published school.message only (not pending communication content).

import type { Role } from './user';
import type { Ref } from './api';
import type { SmartLinkRef } from './smart-link';
import type { AttachmentMeta } from './attachment';

export interface MessageSender {
  id: number;
  name: string;
  role: Role | string;
}

export interface Message {
  id: number;
  channel_id: number;
  sender: MessageSender;
  body: string;
  body_html: string;
  is_pinned: boolean;
  is_important: boolean;
  created_at: string;
  subject?: string | null;
  message_type?: string | null;
  direction?: string | null;
  is_governed?: boolean | null;
  reply_to_id?: number | null;
  reply_to_message_id?: number | null;
  attachment_count?: number | null;
  attachments?: AttachmentMeta[];
  published_at?: string | null;
  is_read?: boolean | null;
  links?: SmartLinkRef[];
}

export interface SendMessageRequest {
  body: string;
  reply_to_message_id?: number;
}

// Announcement entry used by dashboards and parent/child announcements.
export interface Announcement {
  id: number;
  channel: Ref | string;
  sender: string;
  body: string;
  created_at: string;
}
