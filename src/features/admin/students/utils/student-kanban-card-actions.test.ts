import { describe, expect, it } from 'vitest';
import {
  canShowStudentKanbanDocuments,
  canShowStudentKanbanFinance,
  resolveStudentKanbanActionPriority,
  resolveStudentKanbanQuickActions,
  STUDENT_KANBAN_MAX_VISIBLE_ACTIONS,
} from './student-kanban-card-actions';
import type { CurrentUser } from '@/types/user';
import type { Student } from '@/types/student';

const adminUser: CurrentUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@test.local',
  role: 'admin',
  admin_kind: 'school_manager',
  permissions: [
    'view_students',
    'view_attendance',
    'finance.view',
    'view_exam_results',
    'view_timetable',
    'manage_students',
  ],
  effective_capabilities: [
    'students.documents.view',
    'students.documents.manage',
  ],
  school: { id: 3, name: 'School' },
  school_ids: [3],
};

const teacherUser: CurrentUser = {
  id: 2,
  name: 'Teacher',
  email: 'teacher@test.local',
  role: 'teacher',
  teacher_id: 12,
  permissions: ['view_students', 'view_attendance', 'view_exam_results'],
  school: { id: 3, name: 'School' },
  school_ids: [3],
};

const limitedAdmin: CurrentUser = {
  id: 3,
  name: 'Limited',
  email: 'limited@test.local',
  role: 'admin',
  admin_kind: 'general_supervisor',
  permissions: ['view_students', 'view_attendance'],
  school: { id: 3, name: 'School' },
  school_ids: [3],
};

const student: Student = {
  id: 854,
  code: null,
  first_name: 'Amin',
  last_name: 'Test',
  status: 'active',
  gender: 'male',
  class: { id: 2062, name: 'H1' },
  level: { id: 2449, name: 'H1' },
  date_of_birth: null,
  admission_date: null,
  email: null,
  phone: null,
};

describe('resolveStudentKanbanActionPriority', () => {
  it('uses admin priority for school managers', () => {
    expect(resolveStudentKanbanActionPriority(adminUser)).toEqual([
      'results',
      'documents',
      'attendance',
      'finance',
      'timetable',
    ]);
  });

  it('uses teacher priority for teacher workspace users', () => {
    expect(resolveStudentKanbanActionPriority(teacherUser)).toEqual([
      'results',
      'attendance',
      'timetable',
    ]);
  });
});

describe('capability gates', () => {
  it('hides finance and documents for teachers', () => {
    expect(canShowStudentKanbanFinance(teacherUser)).toBe(false);
    expect(canShowStudentKanbanDocuments(teacherUser)).toBe(false);
  });

  it('allows documents and finance for capable admins', () => {
    expect(canShowStudentKanbanDocuments(adminUser)).toBe(true);
    expect(canShowStudentKanbanFinance(adminUser)).toBe(true);
  });
});

describe('resolveStudentKanbanQuickActions', () => {
  it('returns at most two visible quick actions', () => {
    const { visible, more } = resolveStudentKanbanQuickActions(adminUser, student);
    expect(visible.length).toBeLessThanOrEqual(STUDENT_KANBAN_MAX_VISIBLE_ACTIONS);
    expect(visible.map((action) => action.id)).toEqual(['results', 'documents']);
    expect(more.some((action) => action.id === 'finance')).toBe(true);
    expect(more.some((action) => action.id === 'edit')).toBe(true);
    expect(more.some((action) => action.id === 'viewProfile')).toBe(true);
  });

  it('uses attendance then results for teachers without finance', () => {
    const { visible, more } = resolveStudentKanbanQuickActions(teacherUser, student);
    expect(visible.map((action) => action.id)).toEqual(['results', 'attendance']);
    expect(visible[0]?.href).toBe('/teacher/classes/2062/exam-results');
    expect(visible[1]?.href).toBe('/teacher/attendance?class=2062');
    expect(visible.some((action) => action.id === 'finance')).toBe(false);
    expect(more.some((action) => action.id === 'finance')).toBe(false);
    expect(more.some((action) => action.id === 'edit')).toBe(false);
  });

  it('falls back when higher-priority actions are unavailable', () => {
    const { visible } = resolveStudentKanbanQuickActions(limitedAdmin, student);
    expect(visible.map((action) => action.id)).toEqual(['attendance']);
    expect(visible.length).toBeLessThanOrEqual(2);
  });

  it('builds class-scoped attendance and results routes', () => {
    const { visible } = resolveStudentKanbanQuickActions(limitedAdmin, student);
    expect(visible[0]?.href).toContain('class_id=2062');
  });
});
