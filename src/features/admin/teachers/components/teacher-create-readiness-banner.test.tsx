// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TeacherCreateReadinessBanner } from './teacher-create-readiness-banner';
import type { TeacherCreateResult } from '@/types/teacher';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params?.count != null ? `${key}:${params.count}` : key,
}));

afterEach(() => {
  cleanup();
});

const baseResult: TeacherCreateResult = {
  teacher_id: 2370,
  account: {
    created: true,
    user_id: 8522,
    status: 'password_setup_required',
    password_was_set: false,
    can_login: false,
  },
  assignments: { requested: 0, created: 0 },
  lifecycle: {
    teacher_registered: true,
    has_account: true,
    can_login: false,
    has_assignments: false,
    assignments_count: 0,
  },
};

describe('TeacherCreateReadinessBanner', () => {
  it('shows automatic account created and password setup required without create-account CTA', () => {
    render(<TeacherCreateReadinessBanner result={baseResult} />);
    expect(screen.getByTestId('teacher-create-readiness')).toBeTruthy();
    expect(
      screen.getByText('admin.academicSetup.teacherCreate.readiness.accountCreated'),
    ).toBeTruthy();
    expect(
      screen.getByText('admin.academicSetup.teacherCreate.readiness.passwordSetupRequired'),
    ).toBeTruthy();
    expect(
      screen.getByText('admin.academicSetup.teacherCreate.readiness.passwordSetupNext'),
    ).toBeTruthy();
    expect(screen.queryByText('admin.account.createAccount')).toBeNull();
    expect(screen.queryByText('admin.academicSetup.teacherCreate.readiness.openAccountManagement')).toBeNull();
    expect(screen.getByText('admin.academicSetup.teacherCreate.readiness.addAnother')).toBeTruthy();
    expect(screen.getByText('admin.academicSetup.teacherCreate.readiness.addAssignment')).toBeTruthy();
  });

  it('does not build Staff Center links from teacher user_id alone', () => {
    const { container } = render(<TeacherCreateReadinessBanner result={baseResult} />);
    expect(container.querySelector('a[href="/admin/staff/8522"]')).toBeNull();
    expect(container.querySelector('a[href^="/admin/staff/"]')).toBeNull();
    const addAssignment = screen.getByRole('link', {
      name: 'admin.academicSetup.teacherCreate.readiness.addAssignment',
    });
    expect(addAssignment.getAttribute('href')).toBe('/admin/teachers/2370?tab=assignments');
    const addAnother = screen.getByRole('link', {
      name: 'admin.academicSetup.teacherCreate.readiness.addAnother',
    });
    expect(addAnother.getAttribute('href')).toBe('/admin/teachers/new');
  });

  it('keeps has_account and password_setup_required semantics without inventing can_login', () => {
    render(<TeacherCreateReadinessBanner result={baseResult} />);
    expect(
      screen.getByText('admin.academicSetup.teacherCreate.readiness.passwordSetupRequired'),
    ).toBeTruthy();
    expect(screen.queryByText('admin.academicSetup.teacherCreate.readiness.canLogin')).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.queryByLabelText(/login/i)).toBeNull();
  });

  it('uses backend assignments_count and does not invent can_login', () => {
    render(
      <TeacherCreateReadinessBanner
        result={{
          ...baseResult,
          lifecycle: {
            ...baseResult.lifecycle,
            has_assignments: true,
            assignments_count: 2,
          },
        }}
      />,
    );
    expect(
      screen.getByText('admin.academicSetup.teacherCreate.readiness.assignmentsCount:2'),
    ).toBeTruthy();
  });

  it('invokes dismiss without restoring staff account management navigation', () => {
    const onDismiss = vi.fn();
    render(<TeacherCreateReadinessBanner result={baseResult} onDismiss={onDismiss} />);
    screen.getByRole('button', { name: 'common.close' }).click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('admin.academicSetup.teacherCreate.readiness.openAccountManagement')).toBeNull();
  });
});
