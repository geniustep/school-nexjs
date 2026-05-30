'use client';

import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card, Badge, DefinitionList, Avatar, SectionHead } from '@/components/ui/primitives';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { formatDate } from '@/lib/utils/format';
import type { Student } from '@/types/student';

export default function StudentProfilePage() {
  // Own profile only (server-enforced).
  const state = useResource<Student>(endpoints.student.profile);

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your personal information" />
      <ResourceView state={state} loadingLabel="Loading your profile…">
        {(s) => (
          <Card>
            <div className="row" style={{ marginBlockEnd: 16 }}>
              <Avatar name={s.full_name} />
              <div className="col" style={{ gap: 2 }}>
                <strong style={{ fontSize: 16 }}>{s.full_name}</strong>
                {s.status && (
                  <Badge tone={s.status === 'active' ? 'green' : 'slate'}>
                    {statusLabel(s.status)}
                  </Badge>
                )}
              </div>
            </div>
            <SectionHead title="Details" />
            <DefinitionList
              items={[
                { label: 'Code', value: s.code ?? '—' },
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
        )}
      </ResourceView>
    </>
  );
}
