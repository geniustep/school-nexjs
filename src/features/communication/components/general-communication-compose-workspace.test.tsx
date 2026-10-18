// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const previewIndividualMock = vi.hoisted(() => vi.fn());
const previewScopeMock = vi.hoisted(() => vi.fn());
const finalizeCommunicationMock = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());
const studentPickSeq = vi.hoisted(() => ({ n: 0 }));
const mockedMaterials = vi.hoisted(() => ({ items: [] as Array<{ id: number | string; clientItemId: string; kind: 'file' | 'link'; state: 'ready' | 'uploading' | 'failed'; name: string; mimetype?: string }> }));

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
  finalizeGeneralCommunication: (...args: unknown[]) => finalizeCommunicationMock(...args),
}));

vi.mock('@/features/attachments/secure-materials/secure-materials-composer', () => ({
  SecureMaterialsComposer: () => <div data-testid="secure-materials" />,
}));
vi.mock('@/features/attachments/secure-materials/use-secure-materials', () => ({
  useSecureMaterials: () => ({
    materials: mockedMaterials.items, error: null, busy: mockedMaterials.items.some(item => item.state === 'uploading'), hasFailure: mockedMaterials.items.some(item => item.state === 'failed'), ready: mockedMaterials.items.every(item => item.state === 'ready'),
    ensureSession: vi.fn().mockResolvedValue({ publicId: 'session-1', credential: 'secret' }),
    addFiles: vi.fn(), addLink: vi.fn(), remove: vi.fn(), cancel: vi.fn(), clearError: vi.fn(),
  }),
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
    mockedMaterials.items = [];
    studentPickSeq.n = 0;
    previewIndividualMock.mockResolvedValue({
      ok: true,
      preview: { can_submit: true, deliverable_user_count: 1 },
    });
    finalizeCommunicationMock.mockResolvedValue({
      ok: true,
      draftId: null,
      outcome: { kind: 'accepted', httpStatus: 200, contentId: null, result: null, data: {} },
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
    expect(finalizeCommunicationMock).not.toHaveBeenCalled();
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

    (resolveFirst as ((value: unknown) => void) | null)?.({
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
      expect(finalizeCommunicationMock).toHaveBeenCalled();
    });
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
      expect(finalizeCommunicationMock).toHaveBeenCalledWith(expect.objectContaining({
        scope: { scope_type: 'individual', recipient_type: 'student', recipient_id: 44 },
        subject: 'موضوع',
        body: 'نص الرسالة',
      }));
      expect(pushMock).toHaveBeenCalledWith('/admin/announcements');
    });
  });
});

describe('announcement share default ON and audience transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedMaterials.items = [];
    finalizeCommunicationMock.mockResolvedValue({
      ok: true,
      draftId: null,
      outcome: { kind: 'accepted', httpStatus: 200, contentId: null, result: null, data: {} },
    });
  });

  afterEach(() => cleanup());


  it('allows title and uploaded image without body, including preview and finalize', async () => {
    mockedMaterials.items = [{ id: 9, clientItemId: 'img-9', kind: 'file', state: 'ready', name: 'photo.png', mimetype: 'image/png' }];
    previewScopeMock.mockResolvedValue({ ok: true, preview: { recipient_summary: {} } });
    const user = userEvent.setup();
    render(<GeneralCommunicationComposeWorkspace contentType="announcement" />);
    await user.selectOptions(screen.getByLabelText('communication.general.scopeLevel'), 'school');
    await user.click(screen.getByLabelText('communication.general.beneficiary.everyone'));
    await user.type(screen.getByLabelText('communication.general.subject'), 'عنوان وصورة');
    expect((screen.getByTestId('general-communication-submit') as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByTestId('general-communication-submit'));
    await waitFor(() => expect(finalizeCommunicationMock).toHaveBeenCalledWith(expect.objectContaining({
      contentType: 'announcement', body: '', subject: 'عنوان وصورة',
    })));
  });

  it.each([
    ['no attachment', []],
    ['PDF', [{ id: 8, clientItemId: 'pdf', kind: 'file', state: 'ready', name: 'a.pdf', mimetype: 'application/pdf' }]],
    ['uploading image', [{ id: 'temp', clientItemId: 'upload', kind: 'file', state: 'uploading', name: 'a.png', mimetype: 'image/png' }]],
    ['failed image', [{ id: 'temp', clientItemId: 'fail', kind: 'file', state: 'failed', name: 'a.png', mimetype: 'image/png' }]],
    ['unconfirmed image', [{ id: 'temp', clientItemId: 'pending', kind: 'file', state: 'ready', name: 'a.png', mimetype: 'image/png' }]],
    ['link', [{ id: 11, clientItemId: 'link', kind: 'link', state: 'ready', name: 'https://example.com/a.png' }]],
  ] as const)('rejects title without body with %s', async (_name, items) => {
    mockedMaterials.items = [...items] as typeof mockedMaterials.items;
    const user = userEvent.setup();
    render(<GeneralCommunicationComposeWorkspace contentType="announcement" />);
    await user.selectOptions(screen.getByLabelText('communication.general.scopeLevel'), 'school');
    await user.click(screen.getByLabelText('communication.general.beneficiary.everyone'));
    await user.type(screen.getByLabelText('communication.general.subject'), 'عنوان فقط');
    expect((screen.getByTestId('general-communication-submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows sharing ON before audience selection, then submits ON for school-wide announcements', async () => {
    const user = userEvent.setup();
    render(<GeneralCommunicationComposeWorkspace contentType="announcement" />);
    const checkbox = screen.getByRole('checkbox', {
      name: 'communication.general.externalMediaShareLabel',
    }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(false);

    await user.selectOptions(screen.getByLabelText('communication.general.scopeLevel'), 'school');
    await user.click(screen.getByLabelText('communication.general.beneficiary.everyone'));
    expect(checkbox.checked).toBe(true);

    await user.type(screen.getByLabelText('communication.general.subject'), 'إعلان عام');
    await user.type(screen.getByLabelText('communication.body'), 'محتوى الإعلان');
    await user.click(screen.getByTestId('general-communication-submit'));
    await waitFor(() => {
      expect(finalizeCommunicationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'announcement',
          scope: { scope_type: 'school', beneficiary_kind: 'everyone' },
          allowExternalMediaShare: true,
        }),
      );
    });
  });

  it('disables sharing on restricted audience and restores default ON on return to school', async () => {
    const user = userEvent.setup();
    render(<GeneralCommunicationComposeWorkspace contentType="announcement" />);
    const checkbox = screen.getByRole('checkbox', {
      name: 'communication.general.externalMediaShareLabel',
    }) as HTMLInputElement;
    await user.selectOptions(screen.getByLabelText('communication.general.scopeLevel'), 'class');
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(true);
    await user.selectOptions(screen.getByLabelText('communication.general.scopeLevel'), 'school');
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(false);
  });

  it('preserves explicit opt-out after audience changes', async () => {
    const user = userEvent.setup();
    render(<GeneralCommunicationComposeWorkspace contentType="announcement" />);
    const checkbox = screen.getByRole('checkbox', {
      name: 'communication.general.externalMediaShareLabel',
    }) as HTMLInputElement;
    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);
    await user.selectOptions(screen.getByLabelText('communication.general.scopeLevel'), 'class');
    await user.selectOptions(screen.getByLabelText('communication.general.scopeLevel'), 'school');
    expect(checkbox.checked).toBe(false);
    await user.click(screen.getByLabelText('communication.general.beneficiary.everyone'));
    await user.type(screen.getByLabelText('communication.general.subject'), 'إعلان');
    await user.type(screen.getByLabelText('communication.body'), 'وصف');
    await user.click(screen.getByTestId('general-communication-submit'));
    await waitFor(() => {
      expect(finalizeCommunicationMock).toHaveBeenCalledWith(
        expect.objectContaining({ allowExternalMediaShare: false }),
      );
    });
  });
});
