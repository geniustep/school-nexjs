'use client';

// No dedicated student announcements endpoint — dashboard feed is the source of truth.

import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { formatDateTime } from '@/lib/utils/format';
import type { StudentDashboard } from '@/types/dashboard';

export default function StudentAnnouncementsPage() {
  const t = useT();
  const state = useResource<StudentDashboard>(endpoints.student.dashboard);

  return (
    <>
      <PageHeader
        title={t('nav.announcements')}
        subtitle={t('studentPortal.announcementsSubtitle')}
      />
      <ResourceView
        state={state}
        loadingLabel={t('announcements.loading')}
        isEmpty={(d) => (d.announcements?.length ?? 0) === 0}
        empty={
          <EmptyState
            icon="📣"
            title={t('nav.announcements')}
            description={t('dashboard.noAnnouncements')}
          />
        }
      >
        {(d) => (
          <Card pad={false}>
            {(d.announcements ?? []).map((a, i) => (
              <div
                key={a.id}
                className="card--pad"
                style={i ? { borderTop: '1px solid var(--c-border)' } : undefined}
              >
                <div className="between">
                  <strong className="tiny">
                    {typeof a.channel === 'string' ? a.channel : a.channel?.name}
                  </strong>
                  <span className="tiny faint">{formatDateTime(a.created_at)}</span>
                </div>
                <div className="tiny muted">{a.sender}</div>
                <div className="mt-2">{a.body}</div>
              </div>
            ))}
          </Card>
        )}
      </ResourceView>
    </>
  );
}
