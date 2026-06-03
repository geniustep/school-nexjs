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
    <TeacherOverviewLayout
      title={t('teacher.allHomeworks')}
      subtitle={t('teacher.overviewAllClasses')}
      classesState={classesState}
      contentLoading={loading}
      contentError={loadError}
      items={items}
      emptyIcon="📝"
      emptyTitle={t('teacher.emptyHomeworkTitle')}
      emptyHint={t('teacher.emptyHomeworkHint')}
    >
      {(filtered) => (
        <div className="grid grid--content-cards">
          {filtered.map(({ item: hw, classId, className }) => (
            <TeacherContentCard
              key={hw.id}
              href={`/teacher/homeworks/${hw.id}`}
              title={hw.name}
              badge={<WorkflowBadge state={hw.state} />}
              meta={
                <>
                  <TeacherOverviewClassLabel classId={classId} className={className} />
                  {hw.subject?.name && <span>{hw.subject.name}</span>}
                  {hw.publish_date && (
                    <span>
                      {t('academic.publishDate')} {formatDate(hw.publish_date)}
                    </span>
                  )}
                  {hw.deadline && (
                    <span>
                      {t('academic.deadline')} {formatDate(hw.deadline)}
                    </span>
                  )}
                </>
              }
              footer={<AttachmentListIndicator item={hw} />}
            />
          ))}
        </div>
      )}
    </TeacherOverviewLayout>
  );
}
