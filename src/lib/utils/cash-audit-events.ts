import type { CashSessionAuditEvent } from '@/types/finance-cash-desk';

const KNOWN_AUDIT_ACTIONS = [
  'opened',
  'collection_attached',
  'movement_created',
  'movement_approved',
  'closing_started',
  'count_submitted',
  'difference_approved',
  'closed',
  'reopened',
  'closure_report_printed',
] as const;

export function cashAuditEventLabelKey(action: string | undefined | null): string {
  const code = (action ?? '').trim();
  if (!code) return 'admin.finance.cashDesk.timeline.unknown';
  if (KNOWN_AUDIT_ACTIONS.includes(code as (typeof KNOWN_AUDIT_ACTIONS)[number])) {
    return `admin.finance.cashDesk.timeline.${code}`;
  }
  return 'admin.finance.cashDesk.timeline.unknown';
}

export function cashAuditEventUserName(event: CashSessionAuditEvent): string | null {
  const user = event.user;
  if (!user) return null;
  if (typeof user === 'string') return user.trim() || null;
  const name = user.name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

export function cashAuditEventTimestamp(event: CashSessionAuditEvent): string | undefined {
  return event.at ?? event.date;
}

export function cashAuditEventReasonText(reason: unknown): string | null {
  if (typeof reason !== 'string') return null;
  const trimmed = reason.trim();
  return trimmed || null;
}
