'use client';

import Link from 'next/link';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { resolveGenderLabel } from '@/features/admin/academic-setup/utils/teacher-profile';
import { resolveTeacherTypeLabelFromCode } from '@/features/admin/staff/utils/staff-center-present';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import type { Teacher, TeacherGuardianContext, TeacherOptions } from '@/types/teacher';
import './teacher-profile-completion.css';

function textOrDash(value: string | null | undefined, dash: string): string {
  const text = value?.trim();
  return text || dash;
}

function optionLabel(
  options: Array<{ value: string; label: string }> | undefined,
  value: string | null | undefined,
  dash: string,
): string {
  const code = value?.trim();
  if (!code) return dash;
  return options?.find((option) => option.value === code)?.label ?? code;
}

function schoolsLabel(teacher: Teacher, dash: string): string {
  const schools = teacher.school_ids?.filter((school) => Boolean(school?.name)) ?? [];
  if (schools.length > 0) return schools.map((school) => school.name).join(' · ');
  return teacher.school?.name?.trim() || dash;
}

function guardianStatus(
  guardian: TeacherGuardianContext | null | undefined,
  t: (key: string) => string,
): { label: string; tone: 'green' | 'slate' | 'amber' } {
  if (guardian == null) {
    return { label: t('admin.teacherProfile.guardianUnavailable'), tone: 'amber' };
  }
  if (guardian.is_guardian) {
    return { label: t('admin.teacherProfile.guardianYes'), tone: 'green' };
  }
  return { label: t('admin.teacherProfile.guardianNo'), tone: 'slate' };
}

export function TeacherFamilyContextCard({ teacher }: { teacher: Teacher }) {
  const t = useT();
  const guardian = teacher.guardian_context;
  const status = guardianStatus(guardian, t);
  const children = guardian?.is_guardian && Array.isArray(guardian.children) ? guardian.children : [];

  return (
    <Card className="teacher-profile-family">
      <SectionHead
        title={t('admin.teacherProfile.familyTitle')}
        action={<Badge tone={status.tone}>{status.label}</Badge>}
      />

      <DefinitionList
        items={[
          {
            label: t('admin.teacherProfile.guardianStatus'),
            value: status.label,
          },
          ...(guardian?.is_guardian
            ? [{ label: t('admin.teacherProfile.linkedChildren'), value: String(guardian.children_count ?? children.length) }]
            : []),
        ]}
      />

      {guardian?.is_guardian ? (
        children.length > 0 ? (
          <div className="teacher-profile-family__children">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/admin/students/${child.id}`}
                className="teacher-profile-family__child"
              >
                <div className="teacher-profile-family__child-head">
                  <strong dir="auto">{child.name || t('common.dash')}</strong>
                  {child.code ? <bdi className="teacher-profile-family__code" dir="ltr">{child.code}</bdi> : null}
                </div>
                <div className="teacher-profile-family__child-meta">
                  {child.class?.name ? (
                    <span>
                      {t('admin.teacherProfile.childClass')}: <bdi dir="auto">{child.class.name}</bdi>
                    </span>
                  ) : null}
                  {child.school?.name ? (
                    <span>
                      {t('admin.teacherProfile.childSchool')}: <bdi dir="auto">{child.school.name}</bdi>
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted teacher-profile-family__empty">{t('admin.teacherProfile.childrenEmpty')}</p>
        )
      ) : null}
    </Card>
  );
}

export function TeacherProfileOverview({
  teacher,
  options,
}: {
  teacher: Teacher;
  options: TeacherOptions | null;
}) {
  const t = useT();
  const dash = t('common.dash');
  const hasLifecycle = Boolean(
    teacher.employment_end_date ||
      teacher.employment_end_reason ||
      teacher.archive_date ||
      teacher.archive_reason,
  );

  return (
    <>
      <Card>
        <SectionHead title={t('admin.teacherProfile.identityTitle')} />
        <DefinitionList
          items={[
            {
              label: t('admin.teacherProfile.fullNameAr'),
              value: <span dir="auto">{textOrDash(teacher.identity?.name_ar, dash)}</span>,
            },
            {
              label: t('admin.teacherProfile.fullNameFr'),
              value: <span dir="auto">{textOrDash(teacher.identity?.name_fr, dash)}</span>,
            },
            {
              label: t('admin.teacherProfile.operationalName'),
              value: <span dir="auto">{textOrDash(teacher.name, dash)}</span>,
            },
            {
              label: t('admin.code'),
              value: <bdi dir="ltr">{textOrDash(teacher.code, dash)}</bdi>,
            },
            {
              label: t('admin.academicSetup.teacherForm.gender'),
              value: resolveGenderLabel(teacher.gender, options, t),
            },
            {
              label: t('admin.academicSetup.teacherForm.dateOfBirth'),
              value: <bdi dir="ltr">{textOrDash(teacher.date_of_birth, dash)}</bdi>,
            },
            {
              label: t('admin.phone'),
              value: <bdi dir="ltr">{textOrDash(teacher.phone, dash)}</bdi>,
            },
            {
              label: t('admin.teacherProfile.mobile'),
              value: <bdi dir="ltr">{textOrDash(teacher.mobile, dash)}</bdi>,
            },
            {
              label: t('admin.email'),
              value: <bdi dir="ltr">{textOrDash(teacher.email, dash)}</bdi>,
            },
            {
              label: t('admin.teacherProfile.school'),
              value: <span dir="auto">{schoolsLabel(teacher, dash)}</span>,
            },
          ]}
        />
      </Card>

      <Card>
        <SectionHead title={t('admin.teacherProfile.professionalTitle')} />
        <DefinitionList
          items={[
            {
              label: t('admin.academicSetup.teacherForm.teacherType'),
              value: resolveTeacherTypeLabelFromCode(teacher.teacher_type, t),
            },
            {
              label: t('admin.academicSetup.teacherForm.qualification'),
              value: optionLabel(options?.qualifications, teacher.qualification, dash),
            },
            {
              label: t('admin.academicSetup.teacherForm.specialization'),
              value: <span dir="auto">{textOrDash(teacher.specialization, dash)}</span>,
            },
            {
              label: t('admin.teacherProfile.hireDate'),
              value: <bdi dir="ltr">{textOrDash(teacher.hire_date, dash)}</bdi>,
            },
            {
              label: t('admin.teacherProfile.contractType'),
              value: optionLabel(options?.contractTypes, teacher.contract_type, dash),
            },
            {
              label: t('admin.teacherProfile.employmentState'),
              value: statusLabel(t, teacher.status),
            },
          ]}
        />
      </Card>

      {hasLifecycle ? (
        <Card>
          <SectionHead title={t('admin.teacherProfile.lifecycleTitle')} />
          <DefinitionList
            items={[
              {
                label: t('admin.teacherDomain.lifecycle.employmentEndDate'),
                value: <bdi dir="ltr">{textOrDash(teacher.employment_end_date, dash)}</bdi>,
              },
              {
                label: t('admin.teacherProfile.employmentEndReason'),
                value: <span dir="auto">{textOrDash(teacher.employment_end_reason, dash)}</span>,
              },
              {
                label: t('admin.teacherProfile.archiveDate'),
                value: <bdi dir="ltr">{textOrDash(teacher.archive_date, dash)}</bdi>,
              },
              {
                label: t('admin.teacherProfile.archiveReason'),
                value: <span dir="auto">{textOrDash(teacher.archive_reason, dash)}</span>,
              },
            ]}
          />
        </Card>
      ) : null}

      <TeacherFamilyContextCard teacher={teacher} />
    </>
  );
}
