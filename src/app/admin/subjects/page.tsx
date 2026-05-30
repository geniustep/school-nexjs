'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader, Card, Badge } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import type { Subject } from '@/types/class';

export default function AdminSubjectsPage() {
  const state = useResource<Subject[]>(endpoints.admin.subjects);

  return (
    <>
      <PageHeader title="Subjects" subtitle="All subjects within your access" />
      <ResourceView
        state={state}
        loadingLabel="Loading subjects…"
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="📖" title="No subjects found" />}
      >
        {(subjects) => (
          <Card>
            <div className="wrap-gap">
              {subjects.map((s) => (
                <Badge key={s.id} tone="blue">
                  {s.name}
                  {s.code ? ` · ${s.code}` : ''}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </ResourceView>
    </>
  );
}
