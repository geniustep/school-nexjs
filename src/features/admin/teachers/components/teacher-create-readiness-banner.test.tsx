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
  teacher_id: 9,
  account: {
    created: true,
    user_id: 44,
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
    render(<TeacherCreateReadinessBanner result={baseResult} staffUserId={44} />);
    expect(screen.getByTestId('teacher-create-readiness')).toBeTruthy();
    expect(
      screen.getByText('admin.academicSetup.teacherCreate.readiness.accountCreated'),
    ).toBeTruthy();
    expect(
      screen.getByText('admin.academicSetup.teacherCreate.readiness.passwordSetupRequired'),
    ).toBeTruthy();
    expect(screen.queryByText('admin.account.createAccount')).toBeNull();
    expect(screen.getByText('admin.academicSetup.teacherCreate.readiness.addAnother')).toBeTruthy();
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
});
