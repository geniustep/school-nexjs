'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/states/states';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { resolveTeacherTypeDisplayLabel } from '@/features/admin/staff/utils/staff-center-present';
import { resolveStaffUserId } from '@/features/admin/staff/utils/normalize-staff-center';
import { StaffCompensationPanel } from '@/features/admin/staff/components/staff-compensation-panel';
import type { StaffMember } from '@/types/academic-setup';

export function StaffTeacherSection({ member }: { member: StaffMember }) {
  const t = useT();
  const teacher = member.teacher;
  const teacherId = member.teacher_id ?? teacher?.id ?? null;
  const staffId = resolveStaffUserId(member);

  if (!member.is_teacher && !teacherId && !teacher) {
    return (
      <>
        <Card className="staff-center-section">
          <SectionHead title={t('admin.staffCenter.teacherLinkTitle')} />
          <EmptyState
            icon="👩‍🏫"
            title={t('admin.staffCenter.noTeacherLinkTitle')}
            description={t('admin.staffCenter.noTeacherLinkDesc')}
          />
        </Card>
        <StaffCompensationPanel staffId={staffId} />
      </>
    );
  }

  const subjects = teacher?.subjects ?? [];
  const classes = teacher?.classes ?? [];
  const teacherName = teacher?.name ?? resolveStaffDisplayName(member);
  const teacherHref = teacherId != null ? `/admin/teachers/${teacherId}` : null;

  return (
    <>
      <Card className="staff-center-section">
        <SectionHead
          title={t('admin.staffCenter.teacherLinkCardTitle')}
          action={
            teacherHref ? (
              <Link href={teacherHref} className="btn btn--primary btn--sm">
                {t('admin.staffCenter.openTeacherProfile')}
              </Link>
            ) : null
          }
        />
        <p className="muted mb-2">{t('admin.staffCenter.teacherLinkCardDesc')}</p>
        <DefinitionList
          items={[
            {
              label: t('admin.staffCenter.linkedTeacher'),
              value: teacherHref ? (
                <Link href={teacherHref} className="link">
                  {teacherName}
                </Link>
              ) : (
                teacherName
              ),
            },
            {
              label: t('admin.academicSetup.teacherForm.teacherType'),
              value: resolveTeacherTypeDisplayLabel(
                member,
                teacher?.teacher_type ?? member.teacher_type,
                t,
              ),
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
              value: subjects.length
                ? subjects.map((subject) => subject.name).join(', ')
                : teacher?.subjects_count ?? 0,
            },
            {
              label: t('nav.classes'),
              value: classes.length
                ? classes.map((cls) => cls.name).join(', ')
                : teacher?.classes_count ?? 0,
            },
            {
              label: t('admin.staffCenter.assignmentsCount'),
              value: teacher?.assignments_count ?? t('common.dash'),
            },
          ]}
        />
      </Card>
      <StaffCompensationPanel staffId={staffId} />
    </>
  );
}

function resolveStaffDisplayName(member: StaffMember): string {
  return member.display_name?.trim() || member.name?.trim() || '—';
}
