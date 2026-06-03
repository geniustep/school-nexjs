'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ClassTagged } from '@/features/teacher/use-teacher-class-aggregate';
import {
  TeacherOverviewClassLabel,
  TeacherOverviewLayout,
} from '@/features/teacher/teacher-global-overview';
import { TeacherContentCard } from '@/features/teacher/ui/teacher-primitives';
import type { SchoolClass } from '@/types/class';
import type { HomeworkSummary } from '@/types/homework';

type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

export default function TeacherSubmissionsPage() {
  const t = useT();
  const { formatDate } = useFormat();
  const classesState = useResource<TeacherClass[]>(endpoints.teacher.classes);
  const [items, setItems] = useState<ClassTagged<HomeworkSummary>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!classesState.data?.length) {
      setItems([]);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);

    Promise.all(
      classesState.data.map(async (c) => {
        const res = await api.get<HomeworkSummary[]>(endpoints.teacher.classHomeworks(c.id));
        if (!res.success) return [] as ClassTagged<HomeworkSummary>[];
        const withSubs = await Promise.all(
          (res.data ?? []).map(async (hw) => {
            const sub = await api.get<unknown[]>(endpoints.teacher.homeworkSubmissions(hw.id));
            if (sub.success && (sub.data?.length ?? 0) > 0) {
              return { item: hw, classId: c.id, className: c.name } as ClassTagged<HomeworkSummary>;
            }
            return null;
          }),
        );
        return withSubs.filter(Boolean) as ClassTagged<HomeworkSummary>[];
      }),
    )
      .then((groups) => {
        if (!active) return;
        setItems(groups.flat());
      })
      .catch(() => {
        if (active) setLoadError(t('errors.network'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [classesState.data, t]);

  return (
    <TeacherOverviewLayout
      title={t('teacher.allSubmissions')}
      subtitle={t('teacher.submissionsOverviewDesc')}
      classesState={classesState}
      contentLoading={loading}
      contentError={loadError}
      items={items}
      emptyIcon="📥"
      emptyTitle={t('teacher.emptySubmissionsTitle')}
      emptyHint={t('teacher.emptySubmissionsHint')}
      showCreateLink={false}
    >
      {(filtered) => (
        <div className="grid grid--content-cards">
          {filtered.map(({ item: hw, classId, className }) => (
            <TeacherContentCard
              key={hw.id}
              href={`/teacher/homeworks/${hw.id}/submissions`}
              title={hw.name}
              badge={<WorkflowBadge state={hw.state} />}
              meta={
                <>
                  <TeacherOverviewClassLabel classId={classId} className={className} />
                  {hw.subject?.name && <span>{hw.subject.name}</span>}
                  {hw.deadline && (
                    <span>
                      {t('academic.deadline')} {formatDate(hw.deadline)}
                    </span>
                  )}
                </>
              }
              footer={
                <span className="muted" style={{ fontSize: 12 }}>
                  {t('teacher.reviewSubmissions')}
                </span>
              }
            />
          ))}
        </div>
      )}
    </TeacherOverviewLayout>
  );
}
