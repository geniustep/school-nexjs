'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { PageHeader, Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { TeacherForm } from '@/features/admin/entity-forms';
import { useTeacherOptions } from '@/features/admin/academic-setup/hooks/use-teacher-options';
import { resolveGenderLabel } from '@/features/admin/academic-setup/utils/teacher-profile';
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
  const state = useAdminResource<Teacher>(isNew ? null : endpoints.admin.teacher(id));
  const optionsState = useTeacherOptions(!isNew);
  const options = optionsState.options;

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
                  <Badge tone={teacher.status === 'active' ? 'green' : 'slate'}>{statusLabel(t, teacher.status)}</Badge>
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
              <>
                <Card>
                  <SectionHead title={t('admin.academicSetup.teacherForm.groups.personal')} />
                  <DefinitionList items={[
                    { label: t('admin.fullName'), value: teacher.name },
                    { label: t('admin.code'), value: teacher.code ?? t('common.dash') },
                    { label: t('admin.academicSetup.teacherForm.gender'), value: resolveGenderLabel(teacher.gender, options, t) },
                    { label: t('admin.academicSetup.teacherForm.dateOfBirth'), value: teacher.date_of_birth ?? t('common.dash') },
                    { label: t('admin.phone'), value: teacher.phone ?? t('common.dash') },
                    { label: t('admin.email'), value: teacher.email ?? t('common.dash') },
                  ]} />
                </Card>
                <Card>
                  <SectionHead title={t('admin.academicSetup.teacherForm.groups.professional')} />
                  <DefinitionList items={[
                    { label: t('admin.academicSetup.teacherForm.specialization'), value: teacher.specialization?.trim() || t('common.dash') },
                    { label: t('admin.academicSetup.teacherForm.teacherType'), value: teacher.teacher_type ?? t('common.dash') },
                    { label: t('admin.academicSetup.teacherForm.qualification'), value: teacher.qualification ?? t('common.dash') },
                    { label: t('admin.academicSetup.teacherForm.weeklyHoursTarget'), value: teacher.weekly_hours_target != null ? String(teacher.weekly_hours_target) : t('common.dash') },
                    { label: t('admin.academicSetup.teacherForm.weeklyHoursMax'), value: teacher.weekly_hours_max != null ? String(teacher.weekly_hours_max) : t('common.dash') },
                    { label: t('admin.academicSetup.teacherForm.maxContinuousMinutes'), value: teacher.max_continuous_minutes != null ? String(teacher.max_continuous_minutes) : t('common.dash') },
                    { label: t('admin.academicSetup.teacherForm.preferCompactSchedule'), value: teacher.prefer_compact_schedule ? t('common.yes') : t('common.no') },
                    { label: t('nav.classes'), value: teacher.classes.map((c) => c.name).join(', ') || t('common.dash') },
                    { label: t('nav.subjects'), value: teacher.subjects.map((s) => s.name).join(', ') || t('common.dash') },
                  ]} />
                </Card>
              </>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
