// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const previewIndividualMock = vi.hoisted(() => vi.fn());
const previewScopeMock = vi.hoisted(() => vi.fn());
const submitIndividualMock = vi.hoisted(() => vi.fn());
const submitGroupMock = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());
const studentPickSeq = vi.hoisted(() => ({ n: 0 }));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: unknown; href: string }) => (
    <a href={href}>{children as never}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: toastError, success: toastSuccess }),
}));

vi.mock('@/features/communication/api/admin-communication-api', () => ({
  previewAdminRecipientScope: (...args: unknown[]) => previewScopeMock(...args),
  previewIndividualCommunication: (...args: unknown[]) => previewIndividualMock(...args),
}));

vi.mock('@/features/communication/api/submit-general-communication', () => ({
  submitGroupGeneralCommunication: (...args: unknown[]) => submitGroupMock(...args),
  submitIndividualGeneralCommunication: (...args: unknown[]) => submitIndividualMock(...args),
}));

vi.mock('@/features/admin/students/components/student-search-picker', () => ({
  StudentSearchPicker: ({
    onSelect,
  }: {
    onSelect: (student: { id: number; name?: string }) => void;
  }) => (
    <button
      type="button"
      data-testid="pick-student"
      onClick={() => {
        studentPickSeq.n += 1;
        onSelect({
          id: studentPickSeq.n === 1 ? 44 : 55,
          name: `طالب ${studentPickSeq.n}`,
        });
      }}
    >
      pick-student
    </button>
  ),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ success: true, data: [], meta: {} }),
  },
}));

vi.mock('@/features/admin/teachers/api/teacher-domain-api', () => ({
  fetchTeachers: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

import { GeneralCommunicationComposeWorkspace } from './general-communication-compose-workspace';

describe('GeneralCommunicationComposeWorkspace — individual deliverability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    studentPickSeq.n = 0;
    previewIndividualMock.mockResolvedValue({
      ok: true,
      preview: { can_submit: true, deliverable_user_count: 1 },
    });
    submitIndividualMock.mockResolvedValue({
      ok: true,
      draftId: null,
      outcome: { kind: 'accepted', httpStatus: 200, contentId: null, result: null, data: {} },
    });
    submitGroupMock.mockResolvedValue({
      ok: true,
      draftId: 9,
      outcome: { kind: 'accepted', httpStatus: 200, contentId: 9, result: null, data: {} },
    });
  });

  afterEach(() => {
    cleanup();
  });

  async function chooseStudentRecipient() {
    const user = userEvent.setup();
    render(<GeneralCommunicationComposeWorkspace contentType="message" />);
    await user.click(screen.getByRole('button', { name: 'communication.general.sendToPerson' }));
    await user.click(screen.getByLabelText('communication.general.person.student'));
    await user.click(screen.getByTestId('pick-student'));
    return user;
  }

  it('A: previews student with school.student.id payload', async () => {
    await chooseStudentRecipient();
    await waitFor(() => {
      expect(previewIndividualMock).toHaveBeenCalledWith({
        recipient_type: 'student',
        recipient_id: 44,
      });
    });
    const payload = previewIndividualMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('user_id');
    expect(payload).not.toHaveProperty('school_id');
    expect(payload).not.toHaveProperty('recipient_user_id');
  });

  it('B: enables submit when can_submit=true and deliverable_user_count=1', async () => {
    const user = await chooseStudentRecipient();
    await waitFor(() => {
      expect(
        screen.getByText('communication.general.individualDeliverabilityReady'),
      ).toBeTruthy();
    });
    await user.type(screen.getByLabelText('communication.general.subject'), 'موضوع');
    await user.type(screen.getByLabelText('communication.body'), 'نص الرسالة');
    expect(
      (screen.getByTestId('general-communication-submit') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('C: disables submit when can_submit=false and deliverable_user_count=0', async () => {
    previewIndividualMock.mockResolvedValue({
      ok: true,
      preview: {
        can_submit: false,
        deliverable_user_count: 0,
        account_status: 'no_account',
      },
    });
    const user = await chooseStudentRecipient();
    await waitFor(() => {
      expect(screen.getByText('communication.general.individualAccountNoAccount')).toBeTruthy();
    });
    await user.type(screen.getByLabelText('communication.general.subject'), 'موضوع');
    await user.type(screen.getByLabelText('communication.body'), 'نص الرسالة');
    expect(
      (screen.getByTestId('general-communication-submit') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(submitIndividualMock).not.toHaveBeenCalled();
  });

  it('D/E: maps recipient-count and missing portal without raw backend text', async () => {
    previewIndividualMock.mockResolvedValue({
      ok: true,
      preview: {
        can_submit: false,
        deliverable_user_count: 0,
        blocking_reasons: ['communication_individual_recipient_count_invalid'],
      },
    });
    await chooseStudentRecipient();
    await waitFor(() => {
      expect(
        screen.getByText('communication.errors.individualRecipientCountInvalid'),
      ).toBeTruthy();
    });
    expect(
      screen.queryByText('Individual messaging requires exactly one deliverable recipient.'),
    ).toBeNull();
    expect(screen.queryByText('communication_individual_recipient_count_invalid')).toBeNull();
  });

  it('F: ignores stale preview when recipient changes mid-flight', async () => {
    let resolveFirst: ((value: unknown) => void) | null = null;
    previewIndividualMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        preview: {
          can_submit: false,
          deliverable_user_count: 0,
          account_status: 'inactive',
        },
      });

    const user = userEvent.setup();
    render(<GeneralCommunicationComposeWorkspace contentType="message" />);
    await user.click(screen.getByRole('button', { name: 'communication.general.sendToPerson' }));
    await user.click(screen.getByLabelText('communication.general.person.student'));
    await user.click(screen.getByTestId('pick-student'));
    await user.click(screen.getByTestId('pick-student'));

    resolveFirst?.({
      ok: true,
      preview: { can_submit: true, deliverable_user_count: 1 },
    });

    await waitFor(() => {
      expect(previewIndividualMock).toHaveBeenCalledTimes(2);
      expect(previewIndividualMock).toHaveBeenLastCalledWith({
        recipient_type: 'student',
        recipient_id: 55,
      });
      expect(screen.getByText('communication.general.individualAccountInactive')).toBeTruthy();
    });
    expect(screen.queryByText('communication.general.individualDeliverabilityReady')).toBeNull();
  });

  it('G: fails closed when preview/network fails', async () => {
    previewIndividualMock.mockResolvedValue({
      ok: false,
      error: { code: 'network_error', message: 'down', details: {} },
    });
    const user = await chooseStudentRecipient();
    await waitFor(() => {
      expect(
        screen.getByText('communication.general.individualDeliverabilityCheckFailed'),
      ).toBeTruthy();
    });
    await user.type(screen.getByLabelText('communication.general.subject'), 'موضوع');
    await user.type(screen.getByLabelText('communication.body'), 'نص الرسالة');
    expect(
      (screen.getByTestId('general-communication-submit') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('H: group communication still submits without individual preview', async () => {
    const user = userEvent.setup();
    render(<GeneralCommunicationComposeWorkspace contentType="message" />);
    await user.click(screen.getByRole('button', { name: 'communication.general.sendToGroup' }));
    await user.selectOptions(screen.getByLabelText('communication.general.scopeLevel'), 'school');
    await user.click(screen.getByLabelText('communication.general.beneficiary.teachers'));
    await user.type(screen.getByLabelText('communication.general.subject'), 'موضوع مجموعة');
    await user.type(screen.getByLabelText('communication.body'), 'نص المجموعة');
    expect(previewIndividualMock).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('general-communication-submit'));
    await waitFor(() => {
      expect(submitGroupMock).toHaveBeenCalled();
    });
    expect(submitIndividualMock).not.toHaveBeenCalled();
  });

  it('I: successful individual submit redirects to /admin/announcements', async () => {
    const user = await chooseStudentRecipient();
    await waitFor(() => {
      expect(
        screen.getByText('communication.general.individualDeliverabilityReady'),
      ).toBeTruthy();
    });
    await user.type(screen.getByLabelText('communication.general.subject'), 'موضوع');
    await user.type(screen.getByLabelText('communication.body'), 'نص الرسالة');
    expect(
      (screen.getByTestId('general-communication-submit') as HTMLButtonElement).disabled,
    ).toBe(false);
    await user.click(screen.getByTestId('general-communication-submit'));
    await waitFor(() => {
      expect(submitIndividualMock).toHaveBeenCalledWith({
        scope: { scope_type: 'individual', recipient_type: 'student', recipient_id: 44 },
        subject: 'موضوع',
        body: 'نص الرسالة',
      });
      expect(pushMock).toHaveBeenCalledWith('/admin/announcements');
    });
  });
});
