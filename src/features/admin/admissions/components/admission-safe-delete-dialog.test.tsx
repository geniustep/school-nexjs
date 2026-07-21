// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdmissionSafeDeleteDialog } from './admission-safe-delete-dialog';

const deleteAdmissionMock = vi.hoisted(() => vi.fn());
const fetchAdmissionMock = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());

vi.mock('../api/admissions-api', () => ({
  deleteAdmission: (...args: unknown[]) => deleteAdmissionMock(...args),
  fetchAdmission: (...args: unknown[]) => fetchAdmissionMock(...args),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 3 }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

describe('AdmissionSafeDeleteDialog', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    deleteAdmissionMock.mockReset();
    fetchAdmissionMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    replaceMock.mockReset();
  });

  it('shows warning and cancels without DELETE', () => {
    const onClose = vi.fn();
    render(
      <AdmissionSafeDeleteDialog
        open
        admissionId={62}
        applicationLabel="أحمد"
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('admission-safe-delete-dialog')).toBeTruthy();
    expect(screen.getByText('admin.admissions.safeDelete.description')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(deleteAdmissionMock).not.toHaveBeenCalled();
  });

  it('confirms once and navigates on success from detail', async () => {
    deleteAdmissionMock.mockResolvedValue({
      success: true,
      data: { deleted: true, id: 62 },
      meta: {},
    });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AdmissionSafeDeleteDialog
        open
        admissionId={62}
        applicationLabel="أحمد"
        navigateOnSuccess
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const confirm = screen.getByRole('button', { name: 'admin.admissions.safeDelete.confirm' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(deleteAdmissionMock).toHaveBeenCalledTimes(1));
    expect(deleteAdmissionMock).toHaveBeenCalledWith(62, { active_school_id: 3 });
    expect(toastSuccess).toHaveBeenCalledWith('admin.admissions.safeDelete.success');
    expect(replaceMock).toHaveBeenCalledWith('/admin/admissions');
    expect(onClose).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('keeps record on 403 and shows permission message', async () => {
    deleteAdmissionMock.mockResolvedValue({
      success: false,
      error: { code: 'forbidden', message: 'no', details: { status: 403 } },
      meta: {},
    });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AdmissionSafeDeleteDialog open admissionId={62} onClose={onClose} onSuccess={onSuccess} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'admin.admissions.safeDelete.confirm' }));

    await waitFor(() =>
      expect(screen.getByText('admin.admissions.safeDelete.forbidden')).toBeTruthy(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('on 409 shows block message and refetches detail', async () => {
    deleteAdmissionMock.mockResolvedValue({
      success: false,
      error: {
        code: 'admission_delete_not_allowed',
        message: 'blocked',
        details: { status: 409, reason: 'has_student' },
      },
      meta: {},
    });
    fetchAdmissionMock.mockResolvedValue({
      success: true,
      data: { id: 62, can_delete: false, student_name: 'أحمد', allowed_actions: {} },
      meta: {},
    });
    const onConflictRefetch = vi.fn();

    render(
      <AdmissionSafeDeleteDialog
        open
        admissionId={62}
        onClose={vi.fn()}
        onConflictRefetch={onConflictRefetch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'admin.admissions.safeDelete.confirm' }));

    await waitFor(() =>
      expect(screen.getByText('admin.admissions.safeDelete.notAllowed')).toBeTruthy(),
    );
    expect(fetchAdmissionMock).toHaveBeenCalled();
    expect(onConflictRefetch).toHaveBeenCalled();
  });

  it('on 404 toasts and refreshes navigation path', async () => {
    deleteAdmissionMock.mockResolvedValue({
      success: false,
      error: { code: 'not_found', message: 'gone', details: { status: 404 } },
      meta: {},
    });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AdmissionSafeDeleteDialog
        open
        admissionId={62}
        navigateOnSuccess
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'admin.admissions.safeDelete.confirm' }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('admin.admissions.safeDelete.notFound'),
    );
    expect(onClose).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/admin/admissions');
  });
});
