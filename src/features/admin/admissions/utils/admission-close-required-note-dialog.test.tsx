// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import {
  isCloseNoteRequiredMessage,
  mapAdmissionActionError,
  mapAdmissionCloseActionError,
} from '../utils/admission-action-errors';
import { validateClose } from '../utils/admission-action-validation';
import { AdmissionCloseDialog } from '../components/admission-close-dialog';
import { AdmissionListActionsMenu } from '../components/admission-list-actions-menu';

const executeAdmissionAction = vi.fn();
const notifySpy = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 1 }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('../api/admissions-api', () => ({
  executeAdmissionAction: (...args: unknown[]) => executeAdmissionAction(...args),
  fetchAdmission: vi.fn(async () => ({
    success: true,
    data: {
      id: 9001,
      student_name: 'طلب اختبار إغلاق — سلمى التجريبية',
      application_status: 'follow_up',
      modern_allowed_actions: [{ code: 'close', allowed: true }],
      primary_next_action: { code: 'log_contact' },
      exception_actions: [{ code: 'close', allowed: true }],
    },
    meta: {},
  })),
}));

vi.mock('../utils/admission-list-invalidate', async () => {
  const actual = await vi.importActual<typeof import('../utils/admission-list-invalidate')>(
    '../utils/admission-list-invalidate',
  );
  return {
    ...actual,
    notifyAdmissionsQueriesInvalidated: (...args: unknown[]) => notifySpy(...args),
  };
});

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
  executeAdmissionAction.mockReset();
  notifySpy.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('close note contract — validation', () => {
  it('rejects blank and whitespace notes before API', () => {
    expect(validateClose({ note: '' })).toBe('admin.admissions.closeDialog.noteRequired');
    expect(validateClose({ note: '   ' })).toBe('admin.admissions.closeDialog.noteRequired');
    expect(validateClose({ note: '\n\t' })).toBe('admin.admissions.closeDialog.noteRequired');
    expect(validateClose({ note: ' سبب ' })).toBeNull();
  });
});

describe('close note contract — error mapping', () => {
  it('maps raw note-required messages without surfacing field paths', () => {
    expect(isCloseNoteRequiredMessage('.note is required to close')).toBe(true);
    expect(isCloseNoteRequiredMessage('note is required to close')).toBe(true);
    expect(mapAdmissionActionError({ message: '.note is required to close' })).toBe(
      'admin.admissions.closeDialog.noteRequired',
    );
    expect(mapAdmissionCloseActionError({ message: 'note is required to close' })).toBe(
      'admin.admissions.closeDialog.noteRequired',
    );
    expect(mapAdmissionCloseActionError({ message: 'Permission denied' })).toBe(
      'admin.admissions.closeDialog.permissionDenied',
    );
    expect(mapAdmissionCloseActionError({ message: 'Invalid state' })).toBe(
      'admin.admissions.closeDialog.invalidState',
    );
    expect(mapAdmissionCloseActionError({ message: 'Application not found', status: 404 })).toBe(
      'admin.admissions.closeDialog.notFound',
    );
    expect(mapAdmissionCloseActionError({ message: 'Network error', code: 'network_error' })).toBe(
      'admin.admissions.closeDialog.networkError',
    );
    expect(mapAdmissionCloseActionError({ message: 'weird_backend_code_xyz' })).toBe(
      'admin.admissions.closeDialog.unknownError',
    );
  });

  it('preserves non-close blocking Arabic messages for other actions', () => {
    expect(
      mapAdmissionActionError({
        blocking_reasons: [{ message: 'بانتظار موافقة الأسرة' }],
      }),
    ).toContain('بانتظار موافقة الأسرة');
    expect(mapAdmissionActionError({ code: 'FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION' })).toContain(
      'FAMILY_APPROVAL',
    );
    expect(mapAdmissionActionError({ status: 409 })).toContain('conflict');
  });
});

describe('AdmissionCloseDialog', () => {
  it('opens with name, focuses note, blocks empty submit, and sends trimmed note only', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    executeAdmissionAction.mockResolvedValue({
      success: true,
      data: { id: 9001, application_status: 'closed' },
      meta: {},
    });

    render(
      <LocaleProvider>
        <AdmissionCloseDialog
          admissionId={9001}
          applicationName="طلب اختبار إغلاق — سلمى التجريبية"
          open
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </LocaleProvider>,
    );

    expect(screen.getByTestId('admission-close-dialog')).toBeTruthy();
    expect(screen.getByTestId('admission-close-dialog-name').textContent).toContain('سلمى');
    const note = screen.getByTestId('admission-close-dialog-note');
    await waitFor(() => expect(document.activeElement).toBe(note));

    await user.click(screen.getByTestId('admission-close-dialog-confirm'));
    expect(executeAdmissionAction).not.toHaveBeenCalled();
    expect(screen.getByTestId('admission-close-dialog-field-error').textContent).toContain(
      'سبب الإغلاق مطلوب',
    );
    expect(note.getAttribute('aria-invalid')).toBe('true');

    await user.clear(note);
    await user.type(note, '   ');
    await user.click(screen.getByTestId('admission-close-dialog-confirm'));
    expect(executeAdmissionAction).not.toHaveBeenCalled();

    await user.clear(note);
    await user.type(note, '  أُغلق الطلب التجريبي بعد التحقق  ');
    await user.click(screen.getByTestId('admission-close-dialog-confirm'));

    await waitFor(() => expect(executeAdmissionAction).toHaveBeenCalledTimes(1));
    const [id, payload, query] = executeAdmissionAction.mock.calls[0];
    expect(id).toBe(9001);
    expect(payload).toEqual({
      action: 'close',
      note: 'أُغلق الطلب التجريبي بعد التحقق',
    });
    expect(payload).not.toHaveProperty('active_school_id');
    expect(payload).not.toHaveProperty('application_status');
    expect(payload).not.toHaveProperty('school_id');
    expect(query).toEqual({ active_school_id: 1 });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps dialog open on backend error and preserves note', async () => {
    const user = userEvent.setup();
    executeAdmissionAction.mockResolvedValue({
      success: false,
      error: { message: '.note is required to close', status: 400 },
    });

    render(
      <LocaleProvider>
        <AdmissionCloseDialog
          admissionId={9001}
          applicationName="Test"
          open
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </LocaleProvider>,
    );

    const note = screen.getByTestId('admission-close-dialog-note');
    await user.type(note, 'ملاحظة محفوظة');
    await user.click(screen.getByTestId('admission-close-dialog-confirm'));

    await waitFor(() =>
      expect(screen.getByTestId('admission-close-dialog-server-error').textContent).toContain(
        'سبب الإغلاق مطلوب',
      ),
    );
    expect(screen.getByTestId('admission-close-dialog')).toBeTruthy();
    expect((note as HTMLTextAreaElement).value).toContain('ملاحظة محفوظة');
    expect(screen.queryByText(/\.note is required/i)).toBeNull();
  });

  it('cancel does not call API and Escape closes when idle', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <LocaleProvider>
        <AdmissionCloseDialog
          admissionId={1}
          open
          onClose={onClose}
          onSuccess={vi.fn()}
        />
      </LocaleProvider>,
    );
    await user.click(screen.getByTestId('admission-close-dialog-cancel'));
    expect(executeAdmissionAction).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    onClose.mockClear();
    render(
      <LocaleProvider>
        <AdmissionCloseDialog
          admissionId={1}
          open
          onClose={onClose}
          onSuccess={vi.fn()}
        />
      </LocaleProvider>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
    expect(executeAdmissionAction).not.toHaveBeenCalled();
  });

  it('double confirm does not send two mutations', async () => {
    const user = userEvent.setup();
    let resolveAction: (value: unknown) => void = () => undefined;
    executeAdmissionAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    render(
      <LocaleProvider>
        <AdmissionCloseDialog admissionId={2} open onClose={vi.fn()} onSuccess={vi.fn()} />
      </LocaleProvider>,
    );
    const note = screen.getByTestId('admission-close-dialog-note');
    await user.type(note, 'سبب واحد');
    const confirm = screen.getByTestId('admission-close-dialog-confirm');
    await user.click(confirm);
    await user.click(confirm);
    expect(executeAdmissionAction).toHaveBeenCalledTimes(1);
    resolveAction({ success: true, data: { id: 2, application_status: 'closed' }, meta: {} });
  });
});

describe('AdmissionListActionsMenu — close opens dialog without mutation', () => {
  it('does not call executeAdmissionAction when Close is chosen', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <AdmissionListActionsMenu
          admissionId={9001}
          listItem={{
            student_name: 'طلب اختبار إغلاق — سلمى التجريبية',
            application_status: 'follow_up',
            modern_allowed_actions: [{ code: 'close', allowed: true }],
            exception_actions: [{ code: 'close', allowed: true }],
            primary_next_action: { code: 'log_contact' },
          }}
        />
      </LocaleProvider>,
    );

    await user.click(screen.getByTestId('admission-row-actions-trigger'));
    const closeItem = await screen.findByTestId('admission-actions-close');
    await user.click(closeItem);
    expect(executeAdmissionAction).not.toHaveBeenCalled();
    expect(await screen.findByTestId('admission-close-dialog')).toBeTruthy();
    expect(screen.getByTestId('admission-close-dialog-name').textContent).toContain('سلمى');
  });
});
