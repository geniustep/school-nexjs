/**
 * Governed announcement recipient contract (Odoo 5D2B / 18.0.1.0.247).
 * Distinct from lightweight dashboard Announcement previews in message.ts.
 */

export type AnnouncementPriority = 'normal' | 'important' | 'urgent' | string;

export interface AnnouncementSenderRef {
  id: number;
  name: string;
}

/** Attachment metadata on detail — no permanent public URL. */
export interface AnnouncementAttachmentRef {
  id: number;
  name: string | null;
  mimetype: string | null;
  file_size: number;
}

/** List/detail item from GET /communication/announcements[/:id]. */
export interface AnnouncementDelivery {
  id: number;
  content_id: number | null;
  school_id: number | null;
  subject: string | null;
  priority: AnnouncementPriority;
  is_pinned: boolean;
  expires_at: string | null;
  published_at: string | null;
  sent_date: string | null;
  is_read: boolean;
  sender: AnnouncementSenderRef | null;
  /** Present on detail only. */
  body?: string | null;
  /** Present on detail only. */
  attachments?: AnnouncementAttachmentRef[];
}

export interface AnnouncementMarkReadResult {
  id: number;
  is_read: boolean;
  marked_now: boolean;
}

export interface AnnouncementListPage {
  items: AnnouncementDelivery[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  unread_count: number;
}
