import { cashAuditEventReasonText, cashAuditEventTimestamp } from '@/lib/utils/cash-audit-events';
import type { CashSessionAuditEvent, CashSessionMovement } from '@/types/finance-cash-desk';

export function resolveMovementTimestamps(
  movements: CashSessionMovement[],
  audit: CashSessionAuditEvent[] = [],
): Map<number, string> {
  const result = new Map<number, string>();

  for (const movement of movements) {
    if (movement.created_at) {
      result.set(movement.id, movement.created_at);
    }
  }

  const pending = movements
    .filter((movement) => !result.has(movement.id))
    .sort((a, b) => a.id - b.id);

  if (!pending.length) return result;

  const createdEvents = audit
    .filter((event) => event.action === 'movement_created')
    .sort((a, b) =>
      (cashAuditEventTimestamp(a) ?? '').localeCompare(cashAuditEventTimestamp(b) ?? ''),
    );

  if (pending.length === createdEvents.length) {
    pending.forEach((movement, index) => {
      const timestamp = cashAuditEventTimestamp(createdEvents[index]!);
      if (timestamp) result.set(movement.id, timestamp);
    });
    return result;
  }

  const queues = new Map<string, CashSessionAuditEvent[]>();
  for (const event of createdEvents) {
    const key = (cashAuditEventReasonText(event.reason) ?? '').trim().toLowerCase();
    const bucket = queues.get(key) ?? [];
    bucket.push(event);
    queues.set(key, bucket);
  }

  for (const movement of pending) {
    const key = (movement.reason ?? '').trim().toLowerCase();
    const bucket = key ? queues.get(key) : undefined;
    const event = bucket?.shift();
    const timestamp = event ? cashAuditEventTimestamp(event) : undefined;
    if (timestamp) result.set(movement.id, timestamp);
  }

  return result;
}

export function movementDisplayTimestamp(
  movement: CashSessionMovement,
  auditTimestamps: Map<number, string>,
): string | undefined {
  return movement.created_at ?? auditTimestamps.get(movement.id);
}
