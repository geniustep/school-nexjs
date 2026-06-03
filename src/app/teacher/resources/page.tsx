'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useTeacherClassAggregate } from '@/features/teacher/use-teacher-class-aggregate';
import {
  TeacherOverviewClassLabel,
  TeacherOverviewLayout,
} from '@/features/teacher/teacher-global-overview';
import { TeacherContentCard } from '@/features/teacher/ui/teacher-primitives';
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
    <TeacherOverviewLayout
      title={t('teacher.allResources')}
      subtitle={t('teacher.overviewAllClasses')}
      classesState={classesState}
      contentLoading={loading}
      contentError={loadError}
      items={items}
      emptyIcon="📚"
      emptyTitle={t('teacher.emptyResourcesTitle')}
      emptyHint={t('teacher.emptyResourcesHint')}
    >
      {(filtered) => (
        <div className="grid grid--content-cards">
          {filtered.map(({ item: r, classId, className }) => (
            <TeacherContentCard
              key={r.id}
              href={`/teacher/resources/${r.id}`}
              title={r.name}
              badge={<WorkflowBadge state={r.state} />}
              meta={
                <>
                  <TeacherOverviewClassLabel classId={classId} className={className} />
                  {r.resource_type && <span>{r.resource_type.toUpperCase()}</span>}
                  {r.publish_date && (
                    <span>
                      {t('academic.publishDate')} {formatDate(r.publish_date)}
                    </span>
                  )}
                </>
              }
              footer={<AttachmentListIndicator item={r} />}
            />
          ))}
        </div>
      )}
    </TeacherOverviewLayout>
  );
}
