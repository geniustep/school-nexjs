import type { PendingMessageSubmitResult, SendChannelMessageOutcome } from '@/types/communication';
import type { Message, MessageSender } from '@/types/message';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeSender(raw: unknown): MessageSender | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asNumber(row.id);
  const name = asString(row.name);
  if (id == null || !name) return null;
  return {
    id,
    name,
    role: (asString(row.role) ?? 'admin') as MessageSender['role'],
  };
}

/** True when payload is a pending-review submission (never a published school.message). */
export function isPendingMessageSubmitResult(data: unknown): data is PendingMessageSubmitResult {
  const row = asRecord(data);
  if (!row) return false;
  if (row.pending_review === true) return true;
  const contentId = asNumber(row.communication_content_id);
  if (contentId == null) return false;
  // Pending payloads do not carry a published message sender.
  return normalizeSender(row.sender) == null;
}

export function normalizePublishedMessage(data: unknown): Message | null {
  const row = asRecord(data);
  if (!row) return null;
  if (isPendingMessageSubmitResult(row)) return null;
  const id = asNumber(row.id);
  const channelId = asNumber(row.channel_id);
  const sender = normalizeSender(row.sender);
  const body = asString(row.body) ?? '';
  const createdAt = asString(row.created_at) ?? asString(row.published_at);
  if (id == null || channelId == null || !sender || !createdAt) return null;
  // Never treat communication_content_id as message id.
  if (asNumber(row.communication_content_id) != null && row.pending_review === true) {
    return null;
  }
  return {
    id,
    channel_id: channelId,
    sender,
    body,
    body_html: asString(row.body_html) ?? body,
    is_pinned: row.is_pinned === true,
    is_important: row.is_important === true,
    created_at: createdAt,
    subject: asString(row.subject),
    message_type: asString(row.message_type),
    direction: asString(row.direction),
    is_governed: typeof row.is_governed === 'boolean' ? row.is_governed : null,
    reply_to_id: asNumber(row.reply_to_id),
    reply_to_message_id: asNumber(row.reply_to_message_id) ?? asNumber(row.reply_to_id),
    attachment_count: asNumber(row.attachment_count),
    published_at: asString(row.published_at),
    is_read: typeof row.is_read === 'boolean' ? row.is_read : null,
  };
}

export function normalizePendingMessageSubmitResult(
  data: unknown,
): PendingMessageSubmitResult | null {
  const row = asRecord(data);
  if (!row || !isPendingMessageSubmitResult(row)) return null;
  const contentId = asNumber(row.communication_content_id);
  const channelId = asNumber(row.channel_id);
  if (contentId == null || channelId == null) return null;
  const last = asRecord(row.last_decision);
  return {
    pending_review: true,
    communication_content_id: contentId,
    channel_id: channelId,
    subject: asString(row.subject),
    summary: asString(row.summary),
    state: asString(row.state) ?? asString(row.communication_state) ?? 'submitted',
    communication_state:
      asString(row.communication_state) ?? asString(row.state) ?? 'submitted',
    message_direction: asString(row.message_direction),
    submitted_at: asString(row.submitted_at),
    changes_requested_reason: asString(row.changes_requested_reason),
    last_decision: last
      ? { state: asString(last.state), reason: asString(last.reason) }
      : null,
    allowed_actions: Array.isArray(row.allowed_actions)
      ? row.allowed_actions.filter((a): a is string => typeof a === 'string')
      : undefined,
    message: asString(row.message),
  };
}

/**
 * Classify a successful send response. HTTP 202 / pending_review → pending.
 * HTTP 201/200 with a message body → published. Never conflates content id with message id.
 */
export function classifySendChannelMessageResult(
  data: unknown,
  httpStatus: number,
): SendChannelMessageOutcome | null {
  const pending = normalizePendingMessageSubmitResult(data);
  if (pending || httpStatus === 202) {
    if (!pending) return null;
    return { kind: 'pending', pending, httpStatus: httpStatus || 202 };
  }
  const message = normalizePublishedMessage(data);
  if (!message) return null;
  return { kind: 'published', message, httpStatus: httpStatus || 201 };
}

/** De-duplicate published messages by Message.id (never by content id). */
export function mergePublishedMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map<number, Message>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => {
    const ta = a.created_at || '';
    const tb = b.created_at || '';
    return ta.localeCompare(tb);
  });
}
