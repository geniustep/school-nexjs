'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { Badge, Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { formatDateTime } from '@/lib/utils/format';
import type { AnnouncementDelivery } from '@/types/announcement-delivery';

function priorityTone(priority: string): 'red' | 'amber' | 'slate' {
  const p = priority.toLowerCase();
  if (p === 'urgent') return 'red';
  if (p === 'important') return 'amber';
  return 'slate';
}

export function AnnouncementListItem({
  item,
  href,
}: {
  item: AnnouncementDelivery;
  href: string;
}) {
  const t = useT();
  const unread = !item.is_read;
  const title = item.subject?.trim() || t('announcements.untitled');
  const priorityLabel =
    item.priority === 'urgent'
      ? t('announcements.priorityUrgent')
      : item.priority === 'important'
        ? t('announcements.priorityImportant')
        : t('announcements.priorityNormal');

  return (
    <Link
      href={href}
      className="card--pad block"
      style={{
        textDecoration: 'none',
        color: 'inherit',
        borderInlineStart: unread
          ? '3px solid var(--raqeem-primary, var(--c-primary))'
          : '3px solid transparent',
        background: unread ? 'var(--c-surface-2)' : undefined,
      }}
      aria-label={
        unread
          ? `${t('announcements.unread')}: ${title}`
          : `${t('announcements.read')}: ${title}`
      }
    >
      <div className="between gap-2">
        <div className="stack gap-1" style={{ minInlineSize: 0, flex: 1 }}>
          <div className="between gap-2">
            <strong
              className="tiny"
              dir="auto"
              style={{ fontWeight: unread ? 700 : 600 }}
            >
              {title}
            </strong>
            {unread && (
              <span className="tiny" aria-hidden="true">
                ●
              </span>
            )}
          </div>
          <div className="tiny muted" dir="auto">
            {item.sender?.name ?? t('announcements.unknownSender')}
          </div>
          <div className="tiny faint" dir="ltr">
            {formatDateTime(item.published_at ?? item.sent_date)}
          </div>
        </div>
        <div className="stack gap-1" style={{ alignItems: 'flex-end' }}>
          {item.is_pinned && (
            <Badge tone="blue">
              <span aria-hidden="true">📌 </span>
              {t('announcements.pinned')}
            </Badge>
          )}
          {item.priority !== 'normal' && (
            <Badge tone={priorityTone(item.priority)}>{priorityLabel}</Badge>
          )}
          <span className="tiny muted">
            {unread ? t('announcements.unread') : t('announcements.read')}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AnnouncementsListCard({
  items,
  hrefFor,
}: {
  items: AnnouncementDelivery[];
  hrefFor: (id: number) => string;
}) {
  return (
    <Card pad={false}>
      {items.map((item, i) => (
        <div
          key={item.id}
          style={i ? { borderTop: '1px solid var(--c-border)' } : undefined}
        >
          <AnnouncementListItem item={item} href={hrefFor(item.id)} />
        </div>
      ))}
    </Card>
  );
}
