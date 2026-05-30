'use client';

import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, Badge } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import type { SchoolClass } from '@/types/class';

// Teacher class list — assigned classes only (server-enforced).
type TeacherClass = Partial<SchoolClass> & { id: number; name: string };

export default function TeacherClassesPage() {
  const state = useResource<TeacherClass[]>(endpoints.teacher.classes);

  return (
    <>
      <PageHeader title="My Classes" subtitle="Classes assigned to you" />
      <ResourceView
        state={state}
        loadingLabel="Loading your classes…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="🏫" title="No assigned classes" description="You have no classes assigned yet." />}
      >
        {(classes) => (
          <div className="grid grid--cards">
            {classes.map((c) => (
              <Link key={c.id} href={`/teacher/classes/${c.id}`}>
                <Card className="row-link">
                  <div className="between">
                    <strong>{c.name}</strong>
                    {c.level?.name && <Badge tone="slate">{c.level.name}</Badge>}
                  </div>
                  <p className="muted tiny mt-2">
                    {typeof c.student_count === 'number' ? `${c.student_count} students` : 'View class'}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
