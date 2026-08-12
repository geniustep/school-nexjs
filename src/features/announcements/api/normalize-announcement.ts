import type {
  AnnouncementAttachmentRef,
  AnnouncementDelivery,
  AnnouncementMarkReadResult,
  AnnouncementSenderRef,
} from '@/types/announcement-delivery';
import { normalizeSmartLinks } from '@/components/attachments/smart-link-cards';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function asIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value;
}

function normalizeSender(raw: unknown): AnnouncementSenderRef | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asInt(row.id);
  const name = asString(row.name);
  if (id === null || id <= 0 || !name) return null;
  return { id, name };
}

function normalizeAttachment(raw: unknown): AnnouncementAttachmentRef | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asInt(row.id);
  if (id === null || id <= 0) return null;
  const size = asInt(row.file_size);
  return {
    id,
    name: asString(row.name),
    mimetype: asString(row.mimetype) ?? asString(row.mime_type),
    file_size: size !== null && size >= 0 ? size : 0,
  };
}

/**
 * Parse a list or detail announcement row. Rejects rows without a positive id.
 * Does not invent audience / recipient_summary / snapshot fields.
 */
export function normalizeAnnouncementDelivery(
  raw: unknown,
  opts?: { detail?: boolean },
): AnnouncementDelivery | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asInt(row.id);
  if (id === null || id <= 0) return null;

  const detail = opts?.detail === true;
  const attachmentsRaw = row.attachments;
  const attachments: AnnouncementAttachmentRef[] = [];
  if (detail && Array.isArray(attachmentsRaw)) {
    for (const item of attachmentsRaw) {
      const att = normalizeAttachment(item);
      if (att) attachments.push(att);
    }
  }

  const contentId = asInt(row.content_id);
  const schoolId = asInt(row.school_id);

  const delivery: AnnouncementDelivery = {
    id,
    content_id: contentId !== null && contentId > 0 ? contentId : null,
    school_id: schoolId !== null && schoolId > 0 ? schoolId : null,
    subject: asString(row.subject),
    priority: asString(row.priority) ?? 'normal',
    is_pinned: asBool(row.is_pinned),
    expires_at: asIso(row.expires_at),
    published_at: asIso(row.published_at),
    sent_date: asIso(row.sent_date),
    is_read: asBool(row.is_read),
    sender: normalizeSender(row.sender),
  };

  if (detail) {
    delivery.body = typeof row.body === 'string' ? row.body : null;
    delivery.attachments = attachments;
    delivery.links = normalizeSmartLinks(row.links ?? row.smart_links ?? row.link_materials);
  }

  return delivery;
}

export function normalizeAnnouncementList(
  data: unknown,
): AnnouncementDelivery[] {
  if (!Array.isArray(data)) return [];
  const out: AnnouncementDelivery[] = [];
  const seen = new Set<number>();
  for (const row of data) {
    const item = normalizeAnnouncementDelivery(row, { detail: false });
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function normalizeMarkReadResult(raw: unknown): AnnouncementMarkReadResult | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asInt(row.id);
  if (id === null || id <= 0) return null;
  return {
    id,
    is_read: asBool(row.is_read),
    marked_now: asBool(row.marked_now),
  };
}

export function readUnreadCount(meta: Record<string, unknown> | null | undefined): number {
  if (!meta) return 0;
  const n = Number(meta.unread_count);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}
