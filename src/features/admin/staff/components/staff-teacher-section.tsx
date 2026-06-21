'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/states/states';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import type { StaffMember } from '@/types/academic-setup';

export function StaffTeacherSection({ member }: { member: StaffMember }) {
  const t = useT();
  const teacher = member.teacher;

  if (!member.is_teacher && !member.teacher_id && !teacher) {
    return (
      <Card className="staff-center-section">
        <SectionHead title={t('admin.staffCenter.teacherLinkTitle')} />
        <EmptyState
          icon="👩‍🏫"
          title={t('admin.staffCenter.noTeacherLinkTitle')}
          description={t('admin.staffCenter.noTeacherLinkDesc')}
        />
      </Card>
    );
  }

  const subjects = teacher?.subjects ?? [];
  const classes = teacher?.classes ?? [];

  return (
    <Card className="staff-center-section">
      <SectionHead
        title={t('admin.staffCenter.teacherLinkTitle')}
        action={
          teacher?.id ? (
            <Link href={`/admin/teachers/${teacher.id}`} className="btn btn--ghost btn--sm">
              {t('admin.staffCenter.openTeacherProfile')}
            </Link>
          ) : null
        }
      />
      <DefinitionList
        items={[
          {
            label: t('admin.staffCenter.teacherId'),
            value: member.teacher_id ?? teacher?.id ?? t('common.dash'),
          },
          {
            label: t('admin.academicSetup.teacherForm.teacherType'),
            value: member.teacher_type ?? teacher?.teacher_type ?? t('common.dash'),
          },
          {
            label: t('academic.status'),
            value: teacher?.state ? (
              <Badge tone={teacher.state === 'active' ? 'green' : 'slate'}>
                {statusLabel(t, teacher.state)}
              </Badge>
            ) : (
              t('common.dash')
            ),
          },
          {
            label: t('nav.subjects'),
            value: teacher?.subjects_count ?? subjects.length ?? 0,
          },
          {
            label: t('nav.classes'),
            value: teacher?.classes_count ?? classes.length ?? 0,
          },
          {
            label: t('admin.staffCenter.assignmentsCount'),
            value: teacher?.assignments_count ?? t('common.dash'),
          },
          {
            label: t('admin.staffCenter.teacherSubjects'),
            value: subjects.length
              ? subjects.map((subject) => subject.name).join(', ')
              : t('common.dash'),
          },
          {
            label: t('admin.staffCenter.teacherClasses'),
            value: classes.length ? classes.map((cls) => cls.name).join(', ') : t('common.dash'),
          },
        ]}
      />
    </Card>
  );
}
