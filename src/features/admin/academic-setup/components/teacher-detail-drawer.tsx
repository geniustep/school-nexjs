'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ErrorState, LoadingState } from '@/components/states/states';
import { Badge, DefinitionList } from '@/components/ui/primitives';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import { useTeacherOptions } from '../hooks/use-teacher-options';
import {
  formatAcademicClassLabel,
  formatAcademicLevelLabel,
} from '../utils/format-academic-label';
import { resolveGenderLabel } from '../utils/teacher-profile';
import { SetupDrawer } from './setup-drawer';

function TeacherDetailContent({
  teacher,
  classesById,
}: {
  teacher: Teacher;
  classesById: Map<number, SchoolClass>;
}) {
  const t = useT();
  const { locale } = useLocale();
  const optionsState = useTeacherOptions(true);
  const options = optionsState.options;
  const assignments = teacher.assignments ?? [];
  const assignmentCount = assignments.length || teacher.classes?.length || 0;
  const schoolLabel =
    teacher.school?.name ??
    teacher.school_ids?.map((school) => school.name).join(', ') ??
    t('common.dash');

  const teacherTypeLabel =
    options?.teacherTypes.find((item) => item.value === teacher.teacher_type)?.label ??
    teacher.teacher_type ??
    t('common.dash');

  const qualificationLabel =
    options?.qualifications.find((item) => item.value === teacher.qualification)?.label ??
    teacher.qualification ??
    t('common.dash');

  return (
    <div className="teacher-detail-drawer col" style={{ gap: 20 }}>
      <div className="between wrap" style={{ gap: 12 }}>
        <div className="col" style={{ gap: 4 }}>
          <h2 className="teacher-detail-drawer__title">{teacher.name}</h2>
          {teacher.code ? (
            <p className="tiny muted mono" dir="ltr">
              {teacher.code}
            </p>
          ) : null}
        </div>
        <Badge tone={teacher.status === 'active' ? 'green' : 'slate'}>
          {statusLabel(t, teacher.status)}
        </Badge>
      </div>

      <AccountStatusBadge entity={teacher} showLogin />

      <section className="teacher-detail-drawer__section">
        <h3>{t('admin.academicSetup.teacherForm.groups.personal')}</h3>
        <DefinitionList
          items={[
            { label: t('admin.fullName'), value: teacher.name },
            { label: t('admin.code'), value: teacher.code ?? t('common.dash') },
            {
              label: t('admin.academicSetup.teacherForm.gender'),
              value: resolveGenderLabel(teacher.gender, options, t),
            },
            {
              label: t('admin.academicSetup.teacherForm.dateOfBirth'),
              value: teacher.date_of_birth ?? t('common.dash'),
            },
            { label: t('admin.phone'), value: teacher.phone ?? t('common.dash') },
            { label: t('admin.email'), value: teacher.email ?? t('common.dash') },
          ]}
        />
      </section>

      <section className="teacher-detail-drawer__section">
        <h3>{t('admin.academicSetup.teacherForm.groups.professional')}</h3>
        <DefinitionList
          items={[
            {
              label: t('admin.academicSetup.teacherForm.specialization'),
              value: teacher.specialization?.trim() || t('common.dash'),
            },
            { label: t('admin.academicSetup.teacherForm.teacherType'), value: teacherTypeLabel },
            { label: t('admin.academicSetup.teacherForm.qualification'), value: qualificationLabel },
            { label: t('admin.academicSetup.teacherForm.school'), value: schoolLabel },
          ]}
        />
      </section>

      <section className="teacher-detail-drawer__section">
        <h3>{t('admin.academicSetup.teacherForm.groups.workload')}</h3>
        <DefinitionList
          items={[
            {
              label: t('admin.academicSetup.teacherForm.weeklyHoursTarget'),
              value:
                teacher.weekly_hours_target != null
                  ? String(teacher.weekly_hours_target)
                  : t('common.dash'),
            },
            {
              label: t('admin.academicSetup.teacherForm.weeklyHoursMax'),
              value:
                teacher.weekly_hours_max != null ? String(teacher.weekly_hours_max) : t('common.dash'),
            },
            {
              label: t('admin.academicSetup.teacherForm.maxContinuousMinutes'),
              value:
                teacher.max_continuous_minutes != null
                  ? String(teacher.max_continuous_minutes)
                  : t('common.dash'),
            },
            {
              label: t('admin.academicSetup.teacherForm.preferCompactSchedule'),
              value: teacher.prefer_compact_schedule ? t('common.yes') : t('common.no'),
            },
          ]}
        />
      </section>

      <section className="teacher-detail-drawer__section">
        <div className="between wrap" style={{ gap: 8 }}>
          <h3>{t('admin.academicSetup.teacherForm.steps.assignments')}</h3>
          <span className="tiny muted">
            {assignmentCount > 0
              ? t('admin.academicSetup.teacherForm.assignmentsCount', { count: assignmentCount })
              : t('admin.academicSetup.noTeachingAssignments')}
          </span>
        </div>

        {assignments.length === 0 ? (
          <p className="teacher-detail-drawer__empty">{t('admin.academicSetup.noTeachingAssignments')}</p>
        ) : (
          <div className="teacher-detail-drawer__table-wrap">
            <table className="teacher-detail-drawer__table">
              <thead>
                <tr>
                  <th>{t('admin.academicSetup.teacherForm.assignmentsColumnClass')}</th>
                  <th>{t('admin.academicSetup.teacherDetail.level')}</th>
                  <th>{t('admin.academicSetup.teacherForm.assignmentsColumnSubject')}</th>
                  <th>{t('admin.academicSetup.teacherForm.assignmentsColumnHours')}</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((row) => {
                  const cls = classesById.get(row.class.id);
                  const classLabel = cls
                    ? formatAcademicClassLabel(cls, locale)
                    : formatAcademicClassLabel(
                        { name: row.class.name, code: row.class.name, level: null },
                        locale,
                      );
                  const levelLabel = cls?.level
                    ? formatAcademicLevelLabel(cls.level, locale).primary
                    : t('common.dash');
                  return (
                    <tr key={row.id}>
                      <td>
                        <span>{classLabel.primary}</span>
                        {classLabel.secondary ? (
                          <span className="tiny muted mono block" dir="ltr">
                            {classLabel.secondary}
                          </span>
                        ) : null}
                      </td>
                      <td>{levelLabel}</td>
                      <td>{row.subject.name}</td>
                      <td>{row.weekly_hours ?? t('common.dash')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="teacher-detail-drawer__links row wrap" style={{ gap: 8 }}>
          <Link
            href={`/admin/settings/academic-setup/assignments?view=teacher&teacher_id=${teacher.id}`}
            className="btn btn--ghost btn--sm"
          >
            {t('admin.academicSetup.manageAssignments')}
          </Link>
        </div>
      </section>
    </div>
  );
}

export function TeacherDetailDrawer({
  open,
  teacherId,
  onClose,
}: {
  open: boolean;
  teacherId: number | null;
  onClose: () => void;
}) {
  const t = useT();
  const path = teacherId != null ? endpoints.admin.teacher(teacherId) : null;
  const state = useAdminResource<Teacher>(open ? path : null);
  const classesState = useAdminResource<SchoolClass[]>(open ? endpoints.admin.classes : null, {
    page_size: 500,
  });

  const classesById = useMemo(() => {
    const map = new Map<number, SchoolClass>();
    for (const cls of classesState.data ?? []) map.set(cls.id, cls);
    return map;
  }, [classesState.data]);

  const title = useMemo(() => {
    if (state.data?.name) return state.data.name;
    return t('admin.academicSetup.viewTeacherDetails');
  }, [state.data?.name, t]);

  return (
    <SetupDrawer open={open} title={title} onClose={onClose}>
      {state.loading ? <LoadingState label={t('common.loading')} /> : null}
      {state.error ? <ErrorState error={state.error} onRetry={state.reload} /> : null}
      {state.data ? <TeacherDetailContent teacher={state.data} classesById={classesById} /> : null}
    </SetupDrawer>
  );
}
