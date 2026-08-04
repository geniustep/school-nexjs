// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TeacherCreateForm } from './teacher-create-form';

const apiPost = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => apiPost(...args),
  },
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError, show: vi.fn() }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
  useLocale: () => ({ locale: 'ar' }),
}));

vi.mock('@/features/admin/academic-setup/hooks/use-teacher-options', () => ({
  useTeacherOptions: () => ({
    options: {
      teacherTypes: [{ value: 'unknown', label: 'Unknown' }],
      qualifications: [],
      contractTypes: [],
      statuses: [{ value: 'active', label: 'Active' }],
      genders: [],
      schools: [{ id: 1, name: 'مدرسة واحدة', code: 'S1' }],
      defaults: { teacherType: 'unknown', status: 'active', active: true },
      constraints: {},
    },
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: () => ({
    data: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('@/lib/api/endpoints', () => ({
  endpoints: {
    admin: {
      teachers: '/admin/teachers',
      classes: '/admin/classes',
      subjects: '/admin/subjects',
      levels: '/admin/levels',
    },
  },
}));

describe('TeacherCreateForm', () => {
  beforeEach(() => {
    apiPost.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a single screen without stepper or account fields', () => {
    render(<TeacherCreateForm onSaved={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('teacher-create-form')).toBeTruthy();
    expect(screen.queryByText('admin.academicSetup.teacherForm.steps.profile')).toBeNull();
    expect(screen.queryByText('admin.academicSetup.teacherForm.steps.assignments')).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.queryByText(/createAccount/i)).toBeNull();
    expect(screen.queryByText('admin.code')).toBeNull();
    expect(screen.queryByText('admin.academicSetup.teacherForm.weeklyHoursTarget')).toBeNull();
    expect(screen.getByText('admin.academicSetup.teacherCreate.basicsTitle')).toBeTruthy();
    expect(screen.getByText('admin.academicSetup.teacherCreate.assignmentsTitle')).toBeTruthy();
    expect(screen.getByTestId('teacher-create-submit')).toBeTruthy();
  });

  it('submits atomic create payload and navigates via onSaved', async () => {
    const onSaved = vi.fn();
    apiPost.mockResolvedValue({
      success: true,
      data: {
        id: 77,
        name: 'أستاذة سارة',
        account: {
          created: true,
          user_id: 501,
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
      },
    });

    render(<TeacherCreateForm onSaved={onSaved} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('teacher-create-name'), {
      target: { value: 'أستاذة سارة' },
    });
    fireEvent.click(screen.getByTestId('teacher-create-submit'));

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    const [, payload] = apiPost.mock.calls[0]!;
    expect(payload).toMatchObject({ name: 'أستاذة سارة' });
    expect(payload).not.toHaveProperty('code');
    expect(payload).not.toHaveProperty('create_account');
    expect(payload).not.toHaveProperty('account');
    expect(payload).not.toHaveProperty('login');
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('assignments');

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        77,
        expect.objectContaining({
          teacher_id: 77,
          account: expect.objectContaining({
            created: true,
            status: 'password_setup_required',
            can_login: false,
          }),
          lifecycle: expect.objectContaining({
            has_account: true,
            can_login: false,
            assignments_count: 0,
          }),
        }),
      ),
    );
  });

  it('prevents double submit while saving', async () => {
    let resolvePost: (value: unknown) => void = () => undefined;
    apiPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );

    render(<TeacherCreateForm onSaved={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('teacher-create-name'), {
      target: { value: 'أستاذ أحمد' },
    });
    const submit = screen.getByTestId('teacher-create-submit');
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(apiPost).toHaveBeenCalledTimes(1);
    resolvePost({
      success: true,
      data: {
        id: 1,
        account: {
          created: true,
          status: 'password_setup_required',
          can_login: false,
          password_was_set: false,
        },
        assignments: { requested: 0, created: 0 },
        lifecycle: {
          teacher_registered: true,
          has_account: true,
          can_login: false,
          has_assignments: false,
          assignments_count: 0,
        },
      },
    });
  });

  it('does not claim success on atomic create failure', async () => {
    const onSaved = vi.fn();
    apiPost.mockResolvedValue({
      success: false,
      error: { code: 'duplicate_login', message: 'duplicate' },
    });
    render(<TeacherCreateForm onSaved={onSaved} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByTestId('teacher-create-name'), {
      target: { value: 'أستاذ' },
    });
    fireEvent.click(screen.getByTestId('teacher-create-submit'));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
