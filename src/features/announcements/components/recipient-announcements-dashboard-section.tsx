'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { SectionHead } from '@/components/ui/primitives';
import { AnnouncementsListCard } from '@/features/announcements/components/announcement-list-item';
import { useAnnouncementsList } from '@/features/announcements/hooks/use-announcements-list';
import { useT } from '@/features/i18n/locale-context';
import type { ResourceState } from '@/lib/hooks/use-resource';
import type { AnnouncementListPage } from '@/types/announcement-delivery';

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
  const list = useAnnouncementsList({ pageSize: 5 });
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
      <ResourceView
        state={state}
        loadingLabel={t('announcements.loading')}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <EmptyState
            icon="📣"
            title={sectionTitle}
            description={t('announcements.empty')}
          />
        }
      >
        {(page) => (
          <AnnouncementsListCard
            items={page.items}
            hrefFor={(id) => `${basePath}/${id}`}
          />
        )}
      </ResourceView>
    </div>
  );
}
