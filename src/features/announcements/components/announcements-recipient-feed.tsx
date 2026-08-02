'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import type { ReactNode } from 'react';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { Pagination } from '@/components/tables/data-table';
import { AnnouncementsListCard } from '@/features/announcements/components/announcement-list-item';
import { useAnnouncementsList } from '@/features/announcements/hooks/use-announcements-list';
import { useT } from '@/features/i18n/locale-context';
import type { ResourceState } from '@/lib/hooks/use-resource';
import type { AnnouncementListPage } from '@/types/announcement-delivery';

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
  const list = useAnnouncementsList({ studentId });
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
    <>
      <PageHeader
        title={pageTitle}
        subtitle={
          subtitle ??
          (unread > 0
            ? t('announcements.unreadCount', { count: String(unread) })
            : t('announcements.subtitle'))
        }
        actions={actions}
      />
      <ResourceView
        state={resourceState}
        loadingLabel={t('announcements.loading')}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <EmptyState
            icon="📣"
            title={pageTitle}
            description={t('announcements.empty')}
          />
        }
      >
        {(page) => (
          <>
            <AnnouncementsListCard
              items={page.items}
              hrefFor={(id) => `${basePath}/${id}`}
            />
            {page.total_pages > 1 && (
              <Pagination
                page={page.page}
                totalPages={page.total_pages}
                total={page.total}
                onPage={list.setPage}
              />
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
