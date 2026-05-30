// Message resources — mirrors API_REPORT.md §3.

import type { Role } from './user';
import type { Ref } from './api';

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
}

export interface SendMessageRequest {
  body: string;
}

// Announcement entry used by dashboards and parent/child announcements.
export interface Announcement {
  id: number;
  channel: Ref | string;
  sender: string;
  body: string;
  created_at: string;
}
