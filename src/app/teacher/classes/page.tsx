'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, Badge } from '@/components/ui/primitives';
import { ClassActionGrid } from '@/features/teacher/class-actions';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { SchoolClass } from '@/types/class';

type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

export default function TeacherClassesPage() {
  const t = useT();
  const state = useResource<TeacherClass[]>(endpoints.teacher.classes);

  return (
    <>
      <PageHeader title={t('nav.myClasses')} />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon="🏫"
            title={t('empty.classes')}
            description={t('empty.classes')}
          />
        }
      >
        {(classes) => (
          <div className="grid grid--cards">
            {classes.map((c) => (
              <Card key={c.id}>
                <div className="between">
                  <strong style={{ fontSize: 15 }}>{c.name}</strong>
                  {c.level?.name && <Badge tone="slate">{c.level.name}</Badge>}
                </div>
                <p className="muted tiny mt-2">
                  {typeof c.student_count === 'number'
                    ? t('academic.pupilCount', { count: c.student_count })
                    : t('common.view')}
                </p>
                <ClassActionGrid classId={c.id} />
              </Card>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
