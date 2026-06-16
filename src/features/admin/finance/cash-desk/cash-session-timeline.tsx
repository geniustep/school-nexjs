'use client';

import { useMemo } from 'react';
import { SectionHead } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  cashAuditEventReasonText,
  cashAuditEventTimestamp,
  cashAuditEventUserName,
  resolveAuditEventTitle,
} from '@/lib/utils/cash-audit-events';
import type { CashSession, CashSessionAuditEvent } from '@/types/finance-cash-desk';

function auditEventKey(event: CashSessionAuditEvent, index: number): string {
  if (event.id != null) return String(event.id);
  const ts = cashAuditEventTimestamp(event) ?? '';
  return `${event.action ?? 'event'}-${ts}-${index}`;
}

function CashAuditEventItem({ event }: { event: CashSessionAuditEvent }) {
  const t = useT();
  const { formatDateTime } = useFormat();
  const title = resolveAuditEventTitle(t, event.action);
  const timestamp = cashAuditEventTimestamp(event);
  const userName = cashAuditEventUserName(event);
  const reason = cashAuditEventReasonText(event.reason);
  const note = cashAuditEventReasonText(event.note);

  const metaParts: string[] = [];
  if (userName) metaParts.push(t('admin.finance.cashDesk.timeline.byUser', { user: userName }));
  if (timestamp) metaParts.push(formatDateTime(timestamp));

  const stateBefore = event.state_before;
  const stateAfter = event.state_after;
  const showStateChange =
    stateBefore &&
    stateAfter &&
    stateBefore !== stateAfter &&
    !(stateBefore === 'open' && stateAfter === 'open');

  return (
    <li className="cash-desk-timeline__item">
      <strong className="cash-desk-timeline__title" dir="auto">
        {title}
      </strong>
      {metaParts.length ? (
        <span className="cash-desk-timeline__meta">
          {metaParts.map((part, index) => (
            <span key={index} className="cash-desk-timeline__meta-part">
              {index > 0 ? <span aria-hidden="true"> · </span> : null}
              <bdi>{part}</bdi>
            </span>
          ))}
        </span>
      ) : null}
      {reason ? <p className="cash-desk-timeline__detail">{reason}</p> : null}
      {note && note !== reason ? <p className="cash-desk-timeline__detail">{note}</p> : null}
      {showStateChange ? (
        <p className="cash-desk-timeline__state-change">
          {t('admin.finance.cashDesk.timeline.stateChange', {
            before: t(`admin.finance.cashDesk.states.${stateBefore}`),
            after: t(`admin.finance.cashDesk.states.${stateAfter}`),
          })}
        </p>
      ) : null}
    </li>
  );
}

export function CashSessionTimeline({ session }: { session: CashSession }) {
  const t = useT();
  const events = session.timeline?.length ? session.timeline : session.audit_events ?? [];
  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        const aTs = cashAuditEventTimestamp(a) ?? '';
        const bTs = cashAuditEventTimestamp(b) ?? '';
        return bTs.localeCompare(aTs);
      }),
    [events],
  );

  if (!sorted.length) return null;

  return (
    <section className="cash-desk-timeline card card--pad">
      <SectionHead title={t('admin.finance.cashDesk.timelineTitle')} />
      <ol className="cash-desk-timeline__list">
        {sorted.map((event, index) => (
          <CashAuditEventItem key={auditEventKey(event, index)} event={event} />
        ))}
      </ol>
    </section>
  );
}
