'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { Pagination } from '@/components/tables/data-table';
import { useAnnouncementsList } from '@/features/announcements/hooks/use-announcements-list';
import { useT } from '@/features/i18n/locale-context';
import { formatDateTime } from '@/lib/utils/format';
import type { ResourceState } from '@/lib/hooks/use-resource';
import type { AnnouncementDelivery, AnnouncementListPage } from '@/types/announcement-delivery';
import styles from './announcements-recipient-feed.module.css';

function priorityTone(priority: string): 'red' | 'amber' | 'slate' {
  const normalized = priority.toLowerCase();
  if (normalized === 'urgent') return 'red';
  if (normalized === 'important') return 'amber';
  return 'slate';
}

function RecipientAnnouncementRow({
  item,
  href,
}: {
  item: AnnouncementDelivery;
  href: string;
}) {
  const t = useT();
  const unread = !item.is_read;
  const title = item.subject?.trim() || t('announcements.untitled');
  const publishedAt = item.published_at ?? item.sent_date;
  const priorityLabel =
    item.priority === 'urgent'
      ? t('announcements.priorityUrgent')
      : item.priority === 'important'
        ? t('announcements.priorityImportant')
        : t('announcements.priorityNormal');

  return (
    <Link
      href={href}
      className={unread ? `${styles.item} ${styles.unread}` : styles.item}
      aria-label={
        unread
          ? `${t('announcements.unread')}: ${title}`
          : `${t('announcements.read')}: ${title}`
      }
      data-read={item.is_read ? 'true' : 'false'}
    >
      <span className={styles.statusRail} aria-hidden="true" />

      <div className={styles.itemMain}>
        <div className={styles.titleRow}>
          <div className={styles.titleWrap}>
            {unread ? <span className={styles.unreadDot} aria-hidden="true" /> : null}
            <strong className={styles.title} dir="auto">
              {title}
            </strong>
          </div>
          <div className={styles.badges}>
            {item.is_pinned ? <Badge tone="blue">{t('announcements.pinned')}</Badge> : null}
            {item.priority !== 'normal' ? (
              <Badge tone={priorityTone(item.priority)}>{priorityLabel}</Badge>
            ) : null}
          </div>
        </div>

        <div className={styles.meta}>
          <span className={styles.sender} dir="auto">
            {item.sender?.name ?? t('announcements.unknownSender')}
          </span>
          <span className={styles.separator} aria-hidden="true">
            ·
          </span>
          <time className={styles.time} dateTime={publishedAt ?? undefined}>
            {formatDateTime(publishedAt)}
          </time>
          <span className={styles.readState}>
            {unread ? t('announcements.unread') : t('announcements.read')}
          </span>
        </div>
      </div>

      <span className={styles.openIndicator} aria-hidden="true">
        ‹
      </span>
    </Link>
  );
}

export function AnnouncementsRecipientFeed({
  basePath,
  studentId,
  title,
  subtitle,
  actions,
}: {
  /** e.g. `/student/announcements` — detail at `${basePath}/${id}` */
  basePath: string;
  studentId?: number;
  title?: string;
  subtitle?: string;
  /** Optional header actions (admin create entry, etc.). */
  actions?: ReactNode;
}) {
  const t = useT();
  const list = useAnnouncementsList({ studentId, pageSize: 12 });
  const pageTitle = title ?? t('nav.announcements');

  const resourceState: ResourceState<AnnouncementListPage> = {
    loading: list.loading,
    initialLoading: list.initialLoading,
    fetching: list.fetching,
    data: list.data,
    meta: list.data
      ? {
          pagination: {
            page: list.data.page,
            page_size: list.data.page_size,
            total: list.data.total,
            total_pages: list.data.total_pages,
          },
          unread_count: list.data.unread_count,
        }
      : null,
    error: list.error,
    reload: list.reload,
  };

  const unread = list.data?.unread_count ?? 0;

  return (
    <div className={styles.workspace} data-testid="recipient-announcements-feed">
      <div className={styles.header}>
        <PageHeader
          title={pageTitle}
          subtitle={subtitle ?? t('announcements.subtitle')}
          actions={actions}
        />
        {unread > 0 ? (
          <div className={styles.summary} aria-live="polite">
            <span className={`${styles.summaryItem} ${styles.summaryUnread}`}>
              <span className={styles.unreadDot} aria-hidden="true" />
              <span>{t('announcements.unreadCount', { count: String(unread) })}</span>
            </span>
          </div>
        ) : null}
      </div>

      <ResourceView
        state={resourceState}
        loadingLabel={t('announcements.loading')}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <div className={styles.emptyCard}>
            <EmptyState
              icon="📣"
              title={pageTitle}
              description={t('announcements.empty')}
            />
          </div>
        }
      >
        {(page) => (
          <>
            <div className={styles.list} role="list">
              {page.items.map((item) => (
                <div key={item.id} role="listitem">
                  <RecipientAnnouncementRow item={item} href={`${basePath}/${item.id}`} />
                </div>
              ))}
            </div>
            {page.total_pages > 1 ? (
              <div className={styles.pagination}>
                <Pagination
                  page={page.page}
                  totalPages={page.total_pages}
                  total={page.total}
                  onPage={list.setPage}
                />
              </div>
            ) : null}
          </>
        )}
      </ResourceView>
    </div>
  );
}
