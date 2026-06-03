'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Badge, Card, SectionHead } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { ClassForm, type ClassDetail } from '@/features/admin/entity-forms';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import { statusLabel } from '@/lib/utils/labels';
import type { Student } from '@/types/student';

const QUICK_LINKS = (classId: number) => [
  { href: `/admin/attendance?date=today&class_id=${classId}`, labelKey: 'nav.attendance' as const, icon: '🗓️' },
  { href: `/admin/homeworks?class_id=${classId}`, labelKey: 'nav.homework' as const, icon: '📝' },
  { href: `/admin/resources?class_id=${classId}`, labelKey: 'nav.resources' as const, icon: '📚' },
  { href: `/admin/timetable?class_id=${classId}`, labelKey: 'nav.timetable' as const, icon: '📅' },
  { href: `/admin/exams?class_id=${classId}`, labelKey: 'nav.exams' as const, icon: '📋' },
  { href: `/admin/exam-results?class_id=${classId}`, labelKey: 'nav.results' as const, icon: '📊' },
];

export default function AdminClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const isNew = id === 'new';
  const [editing, setEditing] = useState(isNew);
  const state = useAdminResource<ClassDetail>(isNew ? null : endpoints.admin.class(id));
  const studentsState = useAdminResource<Student[]>(
    isNew ? null : endpoints.admin.students,
    isNew ? undefined : { class_id: id, page_size: 50 },
  );

  if (isNew) {
    return (
      <>
        <Link href="/admin/classes" className="back-link">‹ {t('nav.classes')}</Link>
        <PageHeader title={t('admin.addClass')} />
        <ClassForm onSaved={(cid) => router.push(`/admin/classes/${cid}`)} onCancel={() => router.push('/admin/classes')} />
      </>
    );
  }

  return (
    <>
      <Link href="/admin/classes" className="back-link">‹ {t('nav.classes')}</Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(cls) => (
          <>
            <PageHeader
              title={cls.name}
              subtitle={cls.level?.name ?? undefined}
              actions={
                <div className="row" style={{ gap: 8 }}>
                  <Badge tone={cls.status === 'active' ? 'green' : 'slate'}>{statusLabel(t, cls.status)}</Badge>
                  {!editing && cls.status !== 'archived' && (
                    <>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>{t('common.edit')}</button>
                      <ConfirmActionButton label={t('admin.archive')} confirmMessage={t('admin.confirmArchive')} path={endpoints.admin.classArchive(cls.id)} variant="danger" onSuccess={() => router.push('/admin/classes')} />
                    </>
                  )}
                </div>
              }
            />
            {editing ? (
              <ClassForm cls={cls} onSaved={() => { setEditing(false); state.reload(); }} onCancel={() => setEditing(false)} />
            ) : (
              <>
                <div className="section">
                  <SectionHead title={t('admin.quickLinks')} />
                  <div className="grid grid--cards">
                    {QUICK_LINKS(cls.id).map((link) => (
                      <Link key={link.href} href={link.href}>
                        <Card className="row-link">
                          <span>{link.icon}</span>
                          <strong className="mt-2">{t(link.labelKey)}</strong>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="grid grid--cards">
                  <Card>
                    <SectionHead title={t('nav.teachers')} />
                    <p className="muted">{cls.teachers?.map((te) => te.name).join(', ') || t('common.dash')}</p>
                  </Card>
                  <Card>
                    <SectionHead title={t('nav.subjects')} />
                    <p className="muted">{cls.subjects?.map((s) => s.name).join(', ') || t('common.dash')}</p>
                  </Card>
                  <Card>
                    <SectionHead title={t('nav.students')} />
                    {studentsState.data?.length ? (
                      <ul>
                        {studentsState.data.map((s) => (
                          <li key={s.id}>
                            <Link href={`/admin/students/${s.id}`}>{getStudentDisplayName(s)}</Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">{t('empty.students')}</p>
                    )}
                  </Card>
                </div>
              </>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
