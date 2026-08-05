// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TeacherStaffAccountSection } from './teacher-staff-account-section';
import type { Teacher } from '@/types/teacher';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/features/admin/account/account-status-badge', () => ({
  AccountStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="account-status">{status}</span>
  ),
}));

afterEach(() => {
  cleanup();
});

function teacherFixture(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: 2370,
    name: 'Teacher Fixture',
    code: 'T-2370',
    phone: null,
    email: 'teacher@example.com',
    login: 'teacher.login',
    user_id: 8522,
    account: {
      user_id: 8522,
      status: 'password_setup_required',
      login: 'teacher.login',
    },
    classes: [],
    subjects: [],
    status: 'active',
    qualification: null,
    specialization: null,
    ...overrides,
  };
}

describe('TeacherStaffAccountSection', () => {
  it('shows account status for linked user_id without Staff Center navigation', () => {
    const { container } = render(<TeacherStaffAccountSection teacher={teacherFixture()} />);
    expect(screen.getByTestId('teacher-account-status-card')).toBeTruthy();
    expect(screen.getByTestId('account-status').textContent).toBe('password_setup_required');
    expect(screen.getByTestId('teacher-account-password-setup-hint')).toBeTruthy();
    expect(screen.queryByText('admin.staffCenter.manageStaffAccount')).toBeNull();
    expect(container.querySelector('a[href="/admin/staff/8522"]')).toBeNull();
    expect(container.querySelector('a[href^="/admin/staff/"]')).toBeNull();
  });

  it('does not render when teacher has no linked user_id', () => {
    const { container } = render(
      <TeacherStaffAccountSection teacher={teacherFixture({ user_id: null })} />,
    );
    expect(container.querySelector('[data-testid="teacher-account-status-card"]')).toBeNull();
  });

  it('keeps status visible for active linked accounts without inventing staff eligibility', () => {
    const { container } = render(
      <TeacherStaffAccountSection
        teacher={teacherFixture({
          user_id: 99,
          account: { user_id: 99, status: 'active', login: 'existing.teacher' },
        })}
      />,
    );
    expect(screen.getByTestId('account-status').textContent).toBe('active');
    expect(screen.queryByTestId('teacher-account-password-setup-hint')).toBeNull();
    expect(container.querySelector('a[href="/admin/staff/99"]')).toBeNull();
  });
});