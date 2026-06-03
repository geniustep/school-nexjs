'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, SectionHead, Avatar } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { ChildAcademicActions } from '@/features/parent/child-academic-actions';
import { useSession } from '@/features/auth/session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { ParentDashboard } from '@/types/dashboard';

export default function ParentDashboardPage() {
  const user = useSession();
  const t = useT();
  const { formatDateTime } = useFormat();
  const state = useResource<ParentDashboard>(endpoints.parent.dashboard);

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

            {d.latest_messages?.length ? (
              <div className="section">
                <SectionHead
                  title={t('dashboard.latestMessages')}
                  action={
                    <Link className="btn btn--ghost btn--sm" href="/parent/channels">
                      {t('dashboard.allChannels')}
                    </Link>
                  }
                />
                <Card pad={false}>
                  <div className="msg-feed">
                    {d.latest_messages.map((m) => (
                      <div key={m.id} className="msg-feed__item">
                        <div className="msg-feed__meta">
                          <span className="msg-feed__channel">{m.channel}</span>
                          <span className="msg-feed__time">{formatDateTime(m.created_at)}</span>
                        </div>
                        <div className="msg-feed__sender">{m.sender}</div>
                        <div className="msg-feed__body">{m.body}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : null}
          </>
        )}
      </ResourceView>
    </>
  );
}
