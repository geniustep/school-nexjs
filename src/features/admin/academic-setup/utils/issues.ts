import type { Level, SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { SetupIssue, SetupIssueType } from '../types';
import { deriveAssignments } from './assignments-derive';

const HIGH_LOAD_CLASS_THRESHOLD = 6;

function issue(
  partial: Omit<SetupIssue, 'id'> & { id?: string },
): SetupIssue {
  return {
    id: partial.id ?? `${partial.type}-${partial.entityType}-${partial.entityId}`,
    ...partial,
  };
}

export function detectSetupIssues(
  levels: Level[],
  classes: SchoolClass[],
  teachers: Teacher[],
  t: (key: string, params?: Record<string, string | number>) => string,
): SetupIssue[] {
  const issues: SetupIssue[] = [];
  const assignments = deriveAssignments(classes, teachers);
  const classesByLevel = new Map<number, SchoolClass[]>();

  for (const cls of classes) {
    const levelId = cls.level?.id;
    if (levelId == null) continue;
    const list = classesByLevel.get(levelId) ?? [];
    list.push(cls);
    classesByLevel.set(levelId, list);
  }

  if (levels.length === 0 && classes.length === 0) {
    issues.push(
      issue({
        type: 'no_classes',
        severity: 'error',
        title: t('admin.academicSetup.issues.noClasses'),
        entityType: 'class',
        entityId: 'none',
        targetRoute: '/admin/settings/academic-setup/classes',
        blocksReadiness: true,
      }),
    );
  }

  if (teachers.length === 0) {
    issues.push(
      issue({
        type: 'no_teachers',
        severity: 'warning',
        title: t('admin.academicSetup.issues.noTeachers'),
        entityType: 'teacher',
        entityId: 'none',
        targetRoute: '/admin/settings/academic-setup/teachers',
        blocksReadiness: false,
      }),
    );
  }

  for (const level of levels) {
    const levelClasses = classesByLevel.get(level.id) ?? [];
    if (levelClasses.length === 0) {
      issues.push(
        issue({
          type: 'level_without_classes',
          severity: 'error',
          title: t('admin.academicSetup.issues.levelWithoutClasses', { name: level.name }),
          entityType: 'level',
          entityId: level.id,
          targetRoute: '/admin/settings/academic-setup/classes',
          query: { level: String(level.id) },
          blocksReadiness: true,
        }),
      );
    }
  }

  for (const cls of classes) {
    if ((cls.subjects?.length ?? 0) === 0) {
      issues.push(
        issue({
          type: 'class_without_subjects',
          severity: 'error',
          title: t('admin.academicSetup.issues.classWithoutSubjects', { name: cls.name }),
          entityType: 'class',
          entityId: cls.id,
          targetRoute: '/admin/settings/academic-setup/classes',
          query: { class: String(cls.id) },
          blocksReadiness: true,
        }),
      );
    }
  }

  for (const row of assignments.filter((a) => a.status === 'unassigned')) {
    issues.push(
      issue({
        id: `subject_without_teacher-${row.classId}-${row.subjectId}`,
        type: 'subject_without_teacher',
        severity: 'warning',
        title: t('admin.academicSetup.issues.subjectWithoutTeacher', {
          subject: row.subjectName,
          class: row.className,
        }),
        entityType: 'subject',
        entityId: row.subjectId,
        targetRoute: '/admin/settings/academic-setup/assignments',
        query: { class: String(row.classId), subject: String(row.subjectId) },
        blocksReadiness: true,
      }),
    );
  }

  for (const teacher of teachers) {
    if ((teacher.subjects?.length ?? 0) === 0) {
      issues.push(
        issue({
          type: 'teacher_without_subjects',
          severity: 'warning',
          title: t('admin.academicSetup.issues.teacherWithoutSubjects', { name: teacher.name }),
          entityType: 'teacher',
          entityId: teacher.id,
          targetRoute: '/admin/settings/academic-setup/teachers',
          query: { teacher: String(teacher.id) },
          blocksReadiness: false,
        }),
      );
    }

    if ((teacher.classes?.length ?? 0) === 0) {
      issues.push(
        issue({
          type: 'teacher_without_assignments',
          severity: 'info',
          title: t('admin.academicSetup.issues.teacherWithoutAssignments', { name: teacher.name }),
          entityType: 'teacher',
          entityId: teacher.id,
          targetRoute: '/admin/settings/academic-setup/teachers',
          query: { teacher: String(teacher.id) },
          blocksReadiness: false,
        }),
      );
    }

    if (!teacher.email && !teacher.phone) {
      issues.push(
        issue({
          type: 'teacher_incomplete_profile',
          severity: 'info',
          title: t('admin.academicSetup.issues.teacherIncomplete', { name: teacher.name }),
          entityType: 'teacher',
          entityId: teacher.id,
          targetRoute: '/admin/settings/academic-setup/teachers',
          query: { teacher: String(teacher.id) },
          blocksReadiness: false,
        }),
      );
    }

    if (teacher.status !== 'active') {
      issues.push(
        issue({
          id: `teacher_inactive-${teacher.id}`,
          type: 'teacher_incomplete_profile',
          severity: 'warning',
          title: t('admin.academicSetup.issues.teacherInactive', { name: teacher.name }),
          entityType: 'teacher',
          entityId: teacher.id,
          targetRoute: '/admin/settings/academic-setup/teachers',
          query: { teacher: String(teacher.id), status: 'inactive' },
          blocksReadiness: false,
        }),
      );
    }

    if ((teacher.classes?.length ?? 0) >= HIGH_LOAD_CLASS_THRESHOLD) {
      issues.push(
        issue({
          type: 'teacher_high_workload',
          severity: 'warning',
          title: t('admin.academicSetup.issues.teacherHighLoad', {
            name: teacher.name,
            count: teacher.classes.length,
          }),
          entityType: 'teacher',
          entityId: teacher.id,
          targetRoute: '/admin/settings/academic-setup/teachers',
          query: { teacher: String(teacher.id) },
          blocksReadiness: false,
        }),
      );
    }
  }

  return issues;
}

export function groupIssuesBySeverity(issues: SetupIssue[]) {
  return {
    error: issues.filter((i) => i.severity === 'error'),
    warning: issues.filter((i) => i.severity === 'warning'),
    info: issues.filter((i) => i.severity === 'info'),
  };
}

export function issueTypeSortWeight(type: SetupIssueType): number {
  const weights: Partial<Record<SetupIssueType, number>> = {
    subject_without_teacher: 1,
    class_without_subjects: 2,
    level_without_classes: 3,
    teacher_without_subjects: 4,
    teacher_high_workload: 5,
  };
  return weights[type] ?? 10;
}
