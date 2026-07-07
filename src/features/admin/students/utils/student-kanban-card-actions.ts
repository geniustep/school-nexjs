import { shouldUseTeacherWorkspace } from '@/lib/auth/teacher-workspace';
import {
  canUpdateStudents,
  hasUserCapability,
} from '@/lib/permissions/academic-capabilities';
import { canViewFinance } from '@/lib/permissions/finance';
import { hasPermission } from '@/lib/permissions/permissions';
import { buildStudent360TabHref } from './student-360-tabs';
import type { CurrentUser } from '@/types/user';
import type { Student } from '@/types/student';

export const STUDENT_KANBAN_MAX_VISIBLE_ACTIONS = 2;

export type StudentKanbanActionId =
  | 'documents'
  | 'attendance'
  | 'finance'
  | 'results'
  | 'timetable'
  | 'edit'
  | 'viewProfile';

export type StudentKanbanAction = {
  id: StudentKanbanActionId;
  labelKey: string;
  href: string;
};

const ADMIN_PRIORITY: StudentKanbanActionId[] = [
  'documents',
  'attendance',
  'finance',
  'results',
  'timetable',
];

const TEACHER_PRIORITY: StudentKanbanActionId[] = [
  'attendance',
  'results',
  'timetable',
];

function studentClassId(student: Student): string | null {
  const id = student.class?.id;
  if (id == null) return null;
  return String(id);
}

function todayAttendanceHref(classId: string | null, teacherWorkspace: boolean): string {
  if (teacherWorkspace) {
    return classId
      ? `/teacher/attendance?class=${encodeURIComponent(classId)}`
      : '/teacher/attendance';
  }
  const base = '/admin/attendance?date=today';
  return classId ? `${base}&class_id=${encodeURIComponent(classId)}` : base;
}

function examResultsHref(classId: string | null, teacherWorkspace: boolean): string {
  if (teacherWorkspace) {
    return classId
      ? `/teacher/classes/${encodeURIComponent(classId)}/exam-results`
      : '/teacher/exam-results';
  }
  return classId ? `/admin/exam-results?class_id=${encodeURIComponent(classId)}` : '/admin/exam-results';
}

function timetableHref(teacherWorkspace: boolean): string {
  return teacherWorkspace ? '/teacher/timetable' : '/admin/timetable';
}

function studentProfileHref(studentId: number, classId: string | null, teacherWorkspace: boolean): string {
  if (teacherWorkspace && classId) {
    return `/teacher/classes/${encodeURIComponent(classId)}/students/${studentId}`;
  }
  return `/admin/students/${studentId}`;
}

export function canShowStudentKanbanDocuments(user: CurrentUser | null): boolean {
  if (!user || shouldUseTeacherWorkspace(user)) return false;
  return (
    hasUserCapability(user, 'students.documents.view') ||
    hasUserCapability(user, 'students.documents.manage')
  );
}

export function canShowStudentKanbanAttendance(user: CurrentUser | null): boolean {
  return hasPermission(user, 'view_attendance');
}

export function canShowStudentKanbanFinance(user: CurrentUser | null): boolean {
  if (!user || shouldUseTeacherWorkspace(user)) return false;
  return canViewFinance(user);
}

export function canShowStudentKanbanResults(user: CurrentUser | null): boolean {
  return hasPermission(user, 'view_exam_results');
}

export function canShowStudentKanbanTimetable(user: CurrentUser | null): boolean {
  return hasPermission(user, 'view_timetable');
}

export function canShowStudentKanbanEdit(user: CurrentUser | null): boolean {
  if (!user || shouldUseTeacherWorkspace(user)) return false;
  return canUpdateStudents(user);
}

function buildAction(
  id: StudentKanbanActionId,
  student: Student,
  user: CurrentUser | null,
): StudentKanbanAction | null {
  const studentId = student.id;
  const classId = studentClassId(student);
  const teacherWorkspace = shouldUseTeacherWorkspace(user);

  switch (id) {
    case 'documents':
      return {
        id,
        labelKey: 'admin.student360.tabs.documents',
        href: buildStudent360TabHref(studentId, 'documents'),
      };
    case 'attendance':
      return {
        id,
        labelKey: 'nav.attendance',
        href: todayAttendanceHref(classId, teacherWorkspace),
      };
    case 'finance':
      return {
        id,
        labelKey: 'admin.student360.tabs.finance',
        href: buildStudent360TabHref(studentId, 'finance'),
      };
    case 'results':
      return {
        id,
        labelKey: 'nav.results',
        href: examResultsHref(classId, teacherWorkspace),
      };
    case 'timetable':
      return {
        id,
        labelKey: 'nav.timetable',
        href: timetableHref(teacherWorkspace),
      };
    case 'edit':
      return {
        id,
        labelKey: 'common.edit',
        href: `/admin/students/${studentId}/edit`,
      };
    case 'viewProfile':
      return {
        id,
        labelKey: 'admin.studentsList.kanban.actions.openProfile',
        href: studentProfileHref(studentId, classId, teacherWorkspace),
      };
    default:
      return null;
  }
}

function isActionAllowed(id: StudentKanbanActionId, user: CurrentUser | null): boolean {
  switch (id) {
    case 'documents':
      return canShowStudentKanbanDocuments(user);
    case 'attendance':
      return canShowStudentKanbanAttendance(user);
    case 'finance':
      return canShowStudentKanbanFinance(user);
    case 'results':
      return canShowStudentKanbanResults(user);
    case 'timetable':
      return canShowStudentKanbanTimetable(user);
    case 'edit':
      return canShowStudentKanbanEdit(user);
    case 'viewProfile':
      return hasPermission(user, 'view_students');
    default:
      return false;
  }
}

export function resolveStudentKanbanActionPriority(user: CurrentUser | null): StudentKanbanActionId[] {
  return shouldUseTeacherWorkspace(user) ? TEACHER_PRIORITY : ADMIN_PRIORITY;
}

export function resolveStudentKanbanQuickActions(
  user: CurrentUser | null,
  student: Student,
): {
  visible: StudentKanbanAction[];
  more: StudentKanbanAction[];
} {
  const priority = resolveStudentKanbanActionPriority(user);
  const quickCandidates: StudentKanbanAction[] = [];

  for (const id of priority) {
    if (!isActionAllowed(id, user)) continue;
    const action = buildAction(id, student, user);
    if (action) quickCandidates.push(action);
  }

  const visible = quickCandidates.slice(0, STUDENT_KANBAN_MAX_VISIBLE_ACTIONS);
  const visibleIds = new Set(visible.map((action) => action.id));

  const more: StudentKanbanAction[] = [];

  for (const action of quickCandidates.slice(STUDENT_KANBAN_MAX_VISIBLE_ACTIONS)) {
    more.push(action);
  }

  if (isActionAllowed('edit', user) && !visibleIds.has('edit')) {
    const editAction = buildAction('edit', student, user);
    if (editAction) more.push(editAction);
  }

  if (isActionAllowed('viewProfile', user)) {
    const viewAction = buildAction('viewProfile', student, user);
    if (viewAction && !visibleIds.has('viewProfile')) {
      more.push(viewAction);
    }
  }

  return { visible, more };
}
