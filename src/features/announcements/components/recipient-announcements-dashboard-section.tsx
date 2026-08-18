'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { SectionHead } from '@/components/ui/primitives';
import { useAnnouncementsList } from '@/features/announcements/hooks/use-announcements-list';
import { useT } from '@/features/i18n/locale-context';
import type { ResourceState } from '@/lib/hooks/use-resource';
import { formatDateTime } from '@/lib/utils/format';
import type { AnnouncementDelivery, AnnouncementListPage } from '@/types/announcement-delivery';
import styles from './recipient-announcements-dashboard-section.module.css';

const DASHBOARD_ANNOUNCEMENT_LIMIT = 3;

function RecipientAnnouncementInboxItem({
  item,
  href,
}: {
  item: AnnouncementDelivery;
  href: string;
}) {
  const t = useT();
  const unread = !item.is_read;
  const title = item.subject?.trim() || t('announcements.untitled');
  const sender = item.sender?.name ?? t('announcements.unknownSender');
  const timestamp = item.published_at ?? item.sent_date;
  const priorityLabel =
    item.priority === 'urgent'
      ? t('announcements.priorityUrgent')
      : item.priority === 'important'
        ? t('announcements.priorityImportant')
        : null;

  return (
    <Link
      href={href}
      className={`${styles.item} ${unread ? styles.unread : styles.read}`}
      aria-label={unread ? `${t('announcements.unread')}: ${title}` : title}
      data-testid="recipient-announcement-inbox-item"
    >
      <div className={styles.main}>
        <div className={styles.titleLine}>
          {unread ? (
            <span
              className={styles.unreadDot}
              aria-hidden="true"
              data-testid="recipient-announcement-unread-dot"
            />
          ) : null}
          <strong className={styles.title} dir="auto">
            {title}
          </strong>
          {item.is_pinned || priorityLabel ? (
            <span className={styles.markers}>
              {item.is_pinned ? (
                <span
                  className={styles.marker}
                  aria-label={t('announcements.pinned')}
                  title={t('announcements.pinned')}
                >
                  📌
                </span>
              ) : null}
              {priorityLabel ? (
                <span className={styles.marker} aria-label={priorityLabel} title={priorityLabel}>
                  ⚠️
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
        <div className={`${styles.meta} tiny muted`}>
          <span className={styles.sender} dir="auto">
            {sender}
          </span>
          <span aria-hidden="true">·</span>
          <time className={styles.time} dir="ltr" dateTime={timestamp ?? undefined}>
            {formatDateTime(timestamp)}
          </time>
        </div>
      </div>
    </Link>
  );
}

export function RecipientAnnouncementsDashboardSection({
  basePath,
  title,
  className,
}: {
  basePath: string;
  title?: string;
  className?: string;
}) {
  const t = useT();
  const list = useAnnouncementsList({ pageSize: DASHBOARD_ANNOUNCEMENT_LIMIT });
  const sectionTitle = title ?? t('dashboard.latestMessages');

  const state: ResourceState<AnnouncementListPage> = {
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

  return (
    <div
      className={className ? `section ${className}` : 'section'}
      data-testid="recipient-announcements-dashboard"
    >
      <SectionHead
        title={sectionTitle}
        action={
          <Link className="btn btn--ghost btn--sm" href={basePath}>
            {t('common.viewAll')}
          </Link>
        }
      />
      <div className={styles.shell}>
        <ResourceView
          state={state}
          loadingLabel={t('announcements.loading')}
          isEmpty={(d) => d.items.length === 0}
          empty={
            <div className={styles.empty}>
              <EmptyState
                compact
                icon="📣"
                title={sectionTitle}
                description={t('announcements.empty')}
              />
            </div>
          }
        >
          {(page) => (
            <div className={styles.list} data-testid="recipient-announcements-inbox">
              {page.items.slice(0, DASHBOARD_ANNOUNCEMENT_LIMIT).map((item) => (
                <RecipientAnnouncementInboxItem
                  key={item.id}
                  item={item}
                  href={`${basePath}/${item.id}`}
                />
              ))}
            </div>
          )}
        </ResourceView>
      </div>
    </div>
  );
}
