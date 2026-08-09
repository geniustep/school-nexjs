'use client';

import Link from 'next/link';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import type { TeacherDetail } from '@/types/teacher-domain';

type TeacherWorkloadSummary = {
  planned_weekly_hours?: number | null;
  assignment_count?: number | null;
  active_assignment_count?: number | null;
  workload_limit?: number | null;
  remaining_capacity?: number | null;
  over_capacity?: boolean;
};

function workloadOf(teacher: TeacherDetail): TeacherWorkloadSummary | null {
  return (teacher as TeacherDetail & { workload_summary?: TeacherWorkloadSummary | null })
    .workload_summary ?? null;
}

function valueOrDash(value: number | null | undefined, dash: string): string {
  return value == null ? dash : String(value);
}

export function TeacherAssignmentsPanel({ teacher }: { teacher: TeacherDetail }) {
  const t = useT();
  const workload = workloadOf(teacher);
  const assignments = [...(teacher.assignments ?? [])].sort((a, b) => {
    const classCompare = (a.class?.name ?? '').localeCompare(b.class?.name ?? '', undefined, {
      numeric: true,
      sensitivity: 'base',
    });
    if (classCompare) return classCompare;
    return (a.subject?.name ?? '').localeCompare(b.subject?.name ?? '', undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  return (
    <div className="teacher-assignments-panel">
      <Card>
        <SectionHead
          title={t('admin.teacherDomain.tabs.assignments')}
          action={
            <Link
              href={`/admin/teaching-assignments?teacher_id=${teacher.id}`}
              className="btn btn--primary btn--sm"
            >
              {t('admin.teacherDomain.detail.openAssignments')}
            </Link>
          }
        />
        <DefinitionList
          items={[
            {
              label: t('admin.teacherDomain.columns.activeAssignments'),
              value: String(
                workload?.active_assignment_count ??
                  teacher.assignment_summary?.operational_count ??
                  teacher.assignment_summary?.active_count ??
                  0,
              ),
            },
            {
              label: t('admin.teacherDomain.detail.totalAssignments'),
              value: String(
                workload?.assignment_count ?? teacher.assignment_summary?.total_count ?? 0,
              ),
            },
            {
              label: t('admin.teacherDomain.eligibleTeachers.weeklyLoad'),
              value: valueOrDash(
                workload?.planned_weekly_hours ?? teacher.assignment_summary?.planned_weekly_load,
                t('common.dash'),
              ),
            },
            {
              label: t('admin.teacherDomain.eligibleTeachers.remainingCapacity'),
              value: valueOrDash(workload?.remaining_capacity, t('common.dash')),
            },
          ]}
        />
      </Card>

      {assignments.length ? (
        <div className="teacher-assignments-panel__grid">
          {assignments.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/admin/teaching-assignments/${assignment.id}`}
              className="teacher-assignment-card"
            >
              <span className="teacher-assignment-card__topline">
                <strong dir="auto">{assignment.subject?.name ?? t('common.dash')}</strong>
                <Badge tone={assignment.is_operationally_active ? 'green' : 'slate'}>
                  {statusLabel(t, assignment.state ?? 'unknown')}
                </Badge>
              </span>
              <span className="teacher-assignment-card__class" dir="auto">
                {assignment.class?.name ?? t('common.dash')}
              </span>
              <span className="teacher-assignment-card__meta">
                {assignment.academic_year?.name ?? t('common.dash')}
                {' · '}
                {assignment.role ?? t('common.dash')}
                {' · '}
                {valueOrDash(
                  assignment.planned_weekly_load ?? assignment.weekly_hours,
                  t('common.dash'),
                )}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <p className="muted teacher-assignments-panel__empty">
            {t('admin.academicSetup.noAssignments')}
          </p>
        </Card>
      )}
    </div>
  );
}
