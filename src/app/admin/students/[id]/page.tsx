'use client';

import { use } from 'react';
import Link from 'next/link';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card, Badge, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { formatDate } from '@/lib/utils/format';
import type { Student } from '@/types/student';

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const state = useResource<Student>(endpoints.admin.student(id));

  return (
    <>
      <Link href="/admin/students" className="back-link">
        ‹ Back to students
      </Link>
      <ResourceView state={state} loadingLabel="Loading student…">
        {(s) => (
          <>
            <PageHeader
              title={s.full_name}
              subtitle={s.code ? `Code ${s.code}` : undefined}
              actions={
                <Badge tone={s.status === 'active' ? 'green' : 'slate'}>
                  {statusLabel(s.status)}
                </Badge>
              }
            />
            <div className="grid grid--cards">
              <Card>
                <SectionHead title="Profile" />
                <DefinitionList
                  items={[
                    { label: 'Full name', value: s.full_name },
                    { label: 'Class', value: s.class?.name ?? '—' },
                    { label: 'Level', value: s.level?.name ?? '—' },
                    { label: 'Gender', value: s.gender ? statusLabel(s.gender) : '—' },
                    { label: 'Date of birth', value: formatDate(s.date_of_birth) },
                    { label: 'Admission date', value: formatDate(s.admission_date) },
                    { label: 'Email', value: s.email ?? '—' },
                    { label: 'Phone', value: s.phone ?? '—' },
                  ]}
                />
              </Card>
              <Card>
                <SectionHead title="Linked parents" />
                {s.parents.length ? (
                  <div className="col" style={{ gap: 10 }}>
                    {s.parents.map((p) => (
                      <div key={p.id} className="between">
                        <span>{p.name}</span>
                        <span className="tiny faint mono">{p.phone ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No linked parents.</p>
                )}
              </Card>
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
