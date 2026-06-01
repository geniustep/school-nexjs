'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState, LoadingState } from '@/components/states/states';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { PageHeader, Card, InfoBanner } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useTeacherClassAggregate } from '@/features/teacher/use-teacher-class-aggregate';
import type { SchoolClass } from '@/types/class';
import type { HomeworkSummary } from '@/types/homework';

type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

export default function TeacherHomeworksPage() {
  const t = useT();
  const { formatDate } = useFormat();
  const classesState = useResource<TeacherClass[]>(endpoints.teacher.classes);
  const { items, loading, loadError } = useTeacherClassAggregate<HomeworkSummary>(
    classesState.data,
    (classId) => endpoints.teacher.classHomeworks(classId),
    t('errors.network'),
  );

  return (
    <>
      <PageHeader
        title={t('nav.homework')}
        subtitle={t('teacher.navHomeworkDesc')}
      />
      <InfoBanner
        tone="blue"
        title={t('teacher.navHomeworkHintTitle')}
        description={t('teacher.navHomeworkHintDesc')}
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
                icon="📝"
                title={t('empty.homework')}
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
              {items.map(({ item: hw, className }) => (
                <Link key={hw.id} href={`/teacher/homeworks/${hw.id}`}>
                  <Card className="row-link">
                    <div className="between">
                      <strong>{hw.name}</strong>
                      <WorkflowBadge state={hw.state} />
                    </div>
                    <p className="tiny muted mt-2">{className}</p>
                    <div className="row mt-2 tiny muted" style={{ gap: 12, flexWrap: 'wrap' }}>
                      {hw.subject?.name && <span>{hw.subject.name}</span>}
                      {hw.publish_date && <span>{formatDate(hw.publish_date)}</span>}
                    </div>
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
