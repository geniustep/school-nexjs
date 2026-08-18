'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import type { ResourceState } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, SectionHead, Avatar } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { AnnouncementsListCard } from '@/features/announcements/components/announcement-list-item';
import { useAnnouncementsList } from '@/features/announcements/hooks/use-announcements-list';
import { ChildAcademicActions } from '@/features/parent/child-academic-actions';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { AnnouncementListPage } from '@/types/announcement-delivery';
import type { ParentDashboard } from '@/types/dashboard';

export default function ParentDashboardPage() {
  const user = useSession();
  const t = useT();
  const state = useResource<ParentDashboard>(endpoints.parent.dashboard);
  const announcements = useAnnouncementsList({ pageSize: 5 });

  const announcementsState: ResourceState<AnnouncementListPage> = {
    loading: announcements.loading,
    initialLoading: announcements.initialLoading,
    fetching: announcements.fetching,
    data: announcements.data,
    meta: announcements.data
      ? {
          pagination: {
            page: announcements.data.page,
            page_size: announcements.data.page_size,
            total: announcements.data.total,
            total_pages: announcements.data.total_pages,
          },
          unread_count: announcements.data.unread_count,
        }
      : null,
    error: announcements.error,
    reload: announcements.reload,
  };

  const unreadAnnouncements = announcements.data?.unread_count ?? 0;

  return (
    <>
      <PageHeader
        title={t('dashboard.welcome', { name: user.name })}
        subtitle={t('dashboard.parentSubtitle')}
      />
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(d) => (
          <>
            <SectionHead
              title={t('dashboard.myChildren')}
              action={
                <Link className="btn btn--ghost btn--sm" href="/parent/children">
                  {t('common.viewAll')}
                </Link>
              }
            />
            {d.children?.length ? (
              <div className="grid grid--cards">
                {d.children.map((c) => (
                  <Card key={c.id}>
                    <Link href={`/parent/children/${c.id}`} className="row-link">
                      <div className="row" style={{ gap: 12 }}>
                        <Avatar name={getStudentDisplayName(c)} />
                        <div className="col" style={{ gap: 2, flex: 1 }}>
                          <strong style={{ fontSize: 14 }}>{getStudentDisplayName(c)}</strong>
                          <span className="tiny muted">
                            {c.class?.name ?? t('dashboard.noClass')}
                          </span>
                        </div>
                      </div>
                      <div
                        className="between mt-4"
                        style={{
                          paddingBlockStart: 12,
                          borderBlockStart: '1px solid var(--c-border)',
                        }}
                      >
                        <span className="tiny muted">{t('dashboard.todayAttendance')}</span>
                        {(() => {
                          const att =
                            typeof c.today_attendance === 'string'
                              ? c.today_attendance
                              : c.today_attendance?.status;
                          return att ? (
                            <AttendanceBadge status={att} />
                          ) : (
                            <span className="tiny muted">{t('dashboard.notRecorded')}</span>
                          );
                        })()}
                      </div>
                    </Link>
                    <ChildAcademicActions childId={String(c.id)} />
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="👧"
                title={t('empty.children')}
                description={t('empty.children')}
              />
            )}

            <div className="section">
              <SectionHead
                title={t('dashboard.latestMessages')}
                action={
                  <Link className="btn btn--ghost btn--sm" href="/parent/announcements">
                    {t('common.viewAll')}
                  </Link>
                }
              />
              {unreadAnnouncements > 0 && (
                <div className="tiny muted mb-2">
                  {t('announcements.unreadCount', { count: String(unreadAnnouncements) })}
                </div>
              )}
              <ResourceView
                state={announcementsState}
                loadingLabel={t('announcements.loading')}
                isEmpty={(page) => page.items.length === 0}
                empty={
                  <Card>
                    <EmptyState
                      compact
                      icon="📣"
                      title={t('dashboard.latestMessages')}
                      description={t('announcements.empty')}
                    />
                  </Card>
                }
              >
                {(page) => (
                  <AnnouncementsListCard
                    items={page.items}
                    hrefFor={(id) => `/parent/announcements/${id}`}
                  />
                )}
              </ResourceView>
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
