'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { TeacherForm } from '@/features/admin/entity-forms';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { Teacher } from '@/types/teacher';

export default function AdminTeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const state = useResource<Teacher>(isNew ? null : endpoints.admin.teacher(id));

  if (isNew) {
    return (
      <>
        <Link href="/admin/teachers" className="back-link">‹ {t('nav.teachers')}</Link>
        <PageHeader title={t('admin.addTeacher')} />
        <TeacherForm onSaved={(tid) => router.push(`/admin/teachers/${tid}`)} onCancel={() => router.push('/admin/teachers')} />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/teachers" className="back-link">‹ {t('nav.teachers')}</Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(teacher) => (
          <>
            <PageHeader
              title={teacher.name}
              subtitle={teacher.code ?? undefined}
              actions={
                <div className="row" style={{ gap: 8 }}>
                  <Badge tone={teacher.status === 'active' ? 'green' : 'slate'}>{statusLabel(teacher.status)}</Badge>
                  {!editing && teacher.status !== 'archived' && (
                    <>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>{t('common.edit')}</button>
                      <ConfirmActionButton label={t('admin.archive')} confirmMessage={t('admin.confirmArchive')} path={endpoints.admin.teacherArchive(teacher.id)} variant="danger" onSuccess={() => router.push('/admin/teachers')} />
                    </>
                  )}
                </div>
              }
            />
            {editing ? (
              <TeacherForm teacher={teacher} onSaved={() => { setEditing(false); state.reload(); }} onCancel={() => setEditing(false)} />
            ) : (
              <Card>
                <DefinitionList items={[
                  { label: t('admin.code'), value: teacher.code ?? t('common.dash') },
                  { label: t('admin.phone'), value: teacher.phone ?? t('common.dash') },
                  { label: t('admin.email'), value: teacher.email ?? t('common.dash') },
                  { label: 'user_id', value: teacher.user_id ?? t('common.dash') },
                  { label: t('nav.classes'), value: teacher.classes.map((c) => c.name).join(', ') || t('common.dash') },
                  { label: t('nav.subjects'), value: teacher.subjects.map((s) => s.name).join(', ') || t('common.dash') },
                ]} />
              </Card>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
