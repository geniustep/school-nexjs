'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState, LoadingState } from '@/components/states/states';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card, InfoBanner } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useTeacherClassAggregate } from '@/features/teacher/use-teacher-class-aggregate';
import type { SchoolClass } from '@/types/class';
import type { ResourceSummary } from '@/types/resource';

type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

export default function TeacherResourcesPage() {
  const t = useT();
  const { formatDate } = useFormat();
  const classesState = useResource<TeacherClass[]>(endpoints.teacher.classes);
  const { items, loading, loadError } = useTeacherClassAggregate<ResourceSummary>(
    classesState.data,
    (classId) => endpoints.teacher.classResources(classId),
    t('errors.network'),
  );

  return (
    <>
      <PageHeader
        title={t('nav.teacherResources')}
        subtitle={t('teacher.navResourcesDesc')}
      />
      <InfoBanner
        tone="blue"
        title={t('teacher.navResourcesHintTitle')}
        description={t('teacher.navResourcesHintDesc')}
      />
      <ResourceView
        state={classesState}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon="🏫"
            title={t('empty.classes')}
            action={
              <Link className="btn btn--primary btn--sm mt-2" href="/teacher/classes">
                {t('nav.myClasses')}
              </Link>
            }
          />
        }
      >
        {() => {
          if (loading) return <LoadingState label={t('common.loading')} />;
          if (loadError) {
            return (
              <EmptyState icon="!" title={t('errors.serverErrorTitle')} description={loadError} />
            );
          }
          if (items.length === 0) {
            return (
              <EmptyState
                icon="📚"
                title={t('empty.resources')}
                action={
                  <Link className="btn btn--ghost btn--sm mt-2" href="/teacher/classes">
                    {t('nav.myClasses')}
                  </Link>
                }
              />
            );
          }
          return (
            <div className="grid grid--cards">
              {items.map(({ item: r, className }) => (
                <Link key={r.id} href={`/teacher/resources/${r.id}`}>
                  <Card className="row-link">
                    <div className="between">
                      <strong>{r.name}</strong>
                      <WorkflowBadge state={r.state} />
                    </div>
                    <p className="tiny muted mt-2">{className}</p>
                    <div className="row mt-2 tiny muted" style={{ gap: 12, flexWrap: 'wrap' }}>
                      {r.resource_type && <span>{r.resource_type}</span>}
                      {r.publish_date && <span>{formatDate(r.publish_date)}</span>}
                    </div>
                    <AttachmentListIndicator item={r} />
                  </Card>
                </Link>
              ))}
            </div>
          );
        }}
      </ResourceView>
    </>
  );
}
