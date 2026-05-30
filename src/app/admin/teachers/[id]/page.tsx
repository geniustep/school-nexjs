'use client';

// No dedicated teacher-detail endpoint in API v1 — derived from the list.

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { NotFoundState } from '@/components/states/states';
import { PageHeader, Card, Badge, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel, titleCase } from '@/lib/utils/labels';
import type { Teacher } from '@/types/teacher';

export default function AdminTeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const state = useResource<Teacher[]>(endpoints.admin.teachers, { page_size: 200 });

  return (
    <>
      <Link href="/admin/teachers" className="back-link">
        ‹ Back to teachers
      </Link>
      <ResourceView state={state} loadingLabel="Loading teacher…">
        {(list) => {
          const t = list.find((x) => String(x.id) === id);
          if (!t) return <NotFoundState description="This teacher is not within your access." />;
          return (
            <>
              <PageHeader
                title={t.name}
                subtitle={t.code ? `Code ${t.code}` : undefined}
                actions={
                  <Badge tone={t.status === 'active' ? 'green' : 'slate'}>
                    {statusLabel(t.status)}
                  </Badge>
                }
              />
              <div className="grid grid--cards">
                <Card>
                  <SectionHead title="Profile" />
                  <DefinitionList
                    items={[
                      { label: 'Phone', value: t.phone ?? '—' },
                      { label: 'Email', value: t.email ?? '—' },
                      { label: 'Qualification', value: t.qualification ? titleCase(t.qualification) : '—' },
                      { label: 'Specialization', value: t.specialization ?? '—' },
                    ]}
                  />
                </Card>
                <Card>
                  <SectionHead title="Assigned classes" />
                  {t.classes.length ? (
                    <div className="wrap-gap">
                      {t.classes.map((c) => (
                        <Badge key={c.id} tone="blue">
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No assigned classes.</p>
                  )}
                  <SectionHead title="Subjects" />
                  {t.subjects.length ? (
                    <div className="wrap-gap">
                      {t.subjects.map((s) => (
                        <Badge key={s.id} tone="slate">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No assigned subjects.</p>
                  )}
                </Card>
              </div>
            </>
          );
        }}
      </ResourceView>
    </>
  );
}
