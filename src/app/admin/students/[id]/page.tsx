'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { StudentForm } from '@/features/admin/entity-forms';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Student } from '@/types/student';

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const state = useResource<Student>(isNew ? null : endpoints.admin.student(id));

  if (isNew) {
    return (
      <>
        <Link href="/admin/students" className="back-link">‹ {t('nav.students')}</Link>
        <PageHeader title={t('admin.addStudent')} />
        <StudentForm
          onSaved={(studentId) => router.push(`/admin/students/${studentId}`)}
          onCancel={() => router.push('/admin/students')}
        />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/students" className="back-link">‹ {t('nav.students')}</Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(s) => (
          <>
            <PageHeader
              title={getStudentDisplayName(s)}
              subtitle={s.matricule ?? s.code ?? undefined}
              actions={
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <Badge tone={s.status === 'active' ? 'green' : 'slate'}>{statusLabel(s.status)}</Badge>
                  {!editing && (s.status as string) !== 'archived' && (
                    <>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
                        {t('common.edit')}
                      </button>
                      <ConfirmActionButton
                        label={t('admin.archive')}
                        confirmMessage={t('admin.confirmArchive')}
                        path={endpoints.admin.studentArchive(s.id)}
                        variant="danger"
                        onSuccess={() => router.push('/admin/students')}
                      />
                    </>
                  )}
                </div>
              }
            />
            {editing ? (
              <StudentForm
                student={s}
                onSaved={() => { setEditing(false); state.reload(); }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="grid grid--cards">
                <Card>
                  <SectionHead title={t('admin.profile')} />
                  <DefinitionList
                    items={[
                      { label: t('admin.personalName'), value: s.first_name?.trim() || t('common.dash') },
                      { label: t('admin.familyName'), value: s.last_name?.trim() || t('common.dash') },
                      { label: t('admin.fullName'), value: getStudentDisplayName(s) },
                      { label: t('admin.massarCode'), value: <span className="mono">{s.massar_code ?? t('common.dash')}</span> },
                      { label: t('admin.matriculeNumber'), value: <span className="mono">{s.matricule ?? s.code ?? t('common.dash')}</span> },
                      { label: t('nav.classes'), value: s.class?.name ?? t('common.dash') },
                      { label: t('nav.levels'), value: s.level?.name ?? t('common.dash') },
                      { label: t('admin.gender'), value: s.gender ? statusLabel(s.gender) : t('common.dash') },
                      { label: t('admin.dateOfBirth'), value: formatDate(s.date_of_birth) },
                      { label: t('admin.admissionDate'), value: formatDate(s.admission_date) },
                      { label: t('admin.email'), value: s.email ?? t('common.dash') },
                      { label: t('admin.phone'), value: s.phone ?? t('common.dash') },
                    ]}
                  />
                </Card>
                <Card>
                  <SectionHead title={t('admin.linkedParents')} />
                  {(s.parents ?? []).length ? (
                    <div className="col" style={{ gap: 10 }}>
                      {(s.parents ?? []).map((p) => (
                        <div key={p.id} className="between">
                          <span>{p.name}</span>
                          <span className="tiny faint mono">{p.phone ?? t('common.dash')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">{t('admin.noLinkedParents')}</p>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
