// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TeacherAssignmentsPanel } from './teacher-assignments-panel';
import type { TeacherDetail } from '@/types/teacher-domain';

const mocks = vi.hoisted(() => ({
  canManageTeachingAssignments: vi.fn(),
  adminSession: {
    activeAcademicYearId: 7 as number | null,
    academicYearLoading: false,
    academicYearError: null as { code: string; message: string } | null,
  },
  user: { id: 91 },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/features/admin/academic-setup/components/teacher-focused-assignments', () => ({
  TeacherFocusedAssignments: ({
    teacher,
    academicYearId,
    canManage,
  }: {
    teacher: { id: number };
    academicYearId: number;
    canManage: boolean;
  }) => (
    <div
      data-testid="teacher-focused-assignments"
      data-teacher-id={teacher.id}
      data-academic-year-id={academicYearId}
      data-can-manage={String(canManage)}
    />
  ),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => mocks.adminSession,
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => mocks.user,
}));

vi.mock('@/lib/permissions/academic-setup', () => ({
  canManageTeachingAssignments: (...args: unknown[]) =>
    mocks.canManageTeachingAssignments(...args),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/components/states/states', () => ({
  LoadingState: () => <div data-testid="assignments-loading" />,
  ErrorState: () => <div data-testid="assignments-error" />,
}));

const teacher = {
  id: 2437,
  name: 'أستاذ الاختبار',
  code: 'T-2437',
  status: 'active',
  allowed_actions: { manage_assignments: true },
} as TeacherDetail;

describe('TeacherAssignmentsPanel', () => {
  beforeEach(() => {
    mocks.canManageTeachingAssignments.mockReset();
    mocks.canManageTeachingAssignments.mockReturnValue(true);
    mocks.adminSession.activeAcademicYearId = 7;
    mocks.adminSession.academicYearLoading = false;
    mocks.adminSession.academicYearError = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('uses the canonical teacher-focused workspace with the current teacher and academic year', () => {
    render(<TeacherAssignmentsPanel teacher={teacher} />);

    const focused = screen.getByTestId('teacher-focused-assignments');
    expect(focused.getAttribute('data-teacher-id')).toBe('2437');
    expect(focused.getAttribute('data-academic-year-id')).toBe('7');
    expect(focused.getAttribute('data-can-manage')).toBe('true');

    const workspaceLink = screen.getByRole('link');
    expect(workspaceLink.getAttribute('href')).toBe(
      '/admin/teaching-assignments?teacher_id=2437&academic_year_id=7',
    );
  });

  it('keeps the focused workspace read-only when Backend does not allow assignment management', () => {
    render(
      <TeacherAssignmentsPanel
        teacher={{ ...teacher, allowed_actions: { manage_assignments: false } }}
      />,
    );

    expect(
      screen.getByTestId('teacher-focused-assignments').getAttribute('data-can-manage'),
    ).toBe('false');
  });

  it('does not render assignments before the academic-year context is resolved', () => {
    mocks.adminSession.activeAcademicYearId = null;
    mocks.adminSession.academicYearLoading = true;

    render(<TeacherAssignmentsPanel teacher={teacher} />);

    expect(screen.getByTestId('assignments-loading')).toBeTruthy();
    expect(screen.queryByTestId('teacher-focused-assignments')).toBeNull();
  });
});
