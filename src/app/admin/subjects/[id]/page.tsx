'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Card } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { SubjectForm, type SubjectDetail } from '@/features/admin/entity-forms';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';

export default function AdminSubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const state = useAdminResource<SubjectDetail>(isNew ? null : endpoints.admin.subject(id));

  if (isNew) {
    return (
      <>
        <Link href="/admin/subjects" className="back-link">‹ {t('nav.subjects')}</Link>
        <PageHeader title={t('admin.addSubject')} />
        <SubjectForm onSaved={(sid) => router.push(`/admin/subjects/${sid}`)} onCancel={() => router.push('/admin/subjects')} />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/subjects" className="back-link">‹ {t('nav.subjects')}</Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(subject) => (
          <>
            <PageHeader
              title={subject.name}
              actions={
                !editing && subject.status !== 'archived' ? (
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>{t('common.edit')}</button>
                    <ConfirmActionButton label={t('admin.archive')} confirmMessage={t('admin.confirmArchive')} path={endpoints.admin.subjectArchive(subject.id)} variant="danger" onSuccess={() => router.push('/admin/subjects')} />
                  </div>
                ) : undefined
              }
            />
            {editing ? (
              <SubjectForm subject={subject} onSaved={() => { setEditing(false); state.reload(); }} onCancel={() => setEditing(false)} />
            ) : (
              <Card>
                <p className="muted">{subject.code ?? t('common.dash')} · {subject.category ?? t('common.dash')}</p>
              </Card>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
