'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState, LoadingState } from '@/components/states/states';
import { PageHeader, Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { SchoolClass } from '@/types/class';
import type { HomeworkSummary } from '@/types/homework';

type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

interface HomeworkWithClass extends HomeworkSummary {
  className: string;
}

export default function TeacherSubmissionsPage() {
  const t = useT();
  const classesState = useResource<TeacherClass[]>(endpoints.teacher.classes);
  const [items, setItems] = useState<HomeworkWithClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!classesState.data?.length) return;
    let active = true;
    setLoading(true);
    setLoadError(null);

    Promise.all(
      classesState.data.map(async (c) => {
        const res = await api.get<HomeworkSummary[]>(endpoints.teacher.classHomeworks(c.id));
        if (!res.success) return [] as HomeworkWithClass[];
        const withSubs = await Promise.all(
          (res.data ?? []).map(async (hw) => {
            const sub = await api.get<unknown[]>(endpoints.teacher.homeworkSubmissions(hw.id));
            if (sub.success && (sub.data?.length ?? 0) > 0) {
              return { ...hw, className: c.name } as HomeworkWithClass;
            }
            return null;
          }),
        );
        return withSubs.filter(Boolean) as HomeworkWithClass[];
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
    <>
      <PageHeader
        title={t('academic.reviewSubmissionsPage')}
        subtitle={t('academic.reviewSubmissionsDesc')}
      />
      <ResourceView
        state={classesState}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon="📥"
            title={t('empty.classes')}
            description={t('empty.submissions')}
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
                icon="📥"
                title={t('empty.submissions')}
                description={t('empty.submissions')}
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
              {items.map((hw) => (
                <Link key={hw.id} href={`/teacher/homeworks/${hw.id}/submissions`}>
                  <Card className="row-link">
                    <strong>{hw.name}</strong>
                    <p className="tiny muted mt-2">{hw.className}</p>
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
