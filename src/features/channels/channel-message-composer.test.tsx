// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const previewMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/features/channels/api/send-channel-message', () => ({
  finalizeChannelMessage: (...args: unknown[]) => sendMock(...args),
}));

vi.mock('@/features/attachments/secure-materials/secure-materials-composer', () => ({
  SecureMaterialsComposer: () => <div data-testid="secure-materials" />,
}));
vi.mock('@/features/attachments/secure-materials/use-secure-materials', () => ({
  useSecureMaterials: () => ({
    materials: [], error: null, busy: false, hasFailure: false, ready: true,
    ensureSession: vi.fn().mockResolvedValue({ publicId: 'session-1', credential: 'secret' }),
    addFiles: vi.fn(), addLink: vi.fn(), remove: vi.fn(), cancel: vi.fn(), clearError: vi.fn(),
  }),
}));

vi.mock('@/features/channels/api/preview-channel-message-recipients', () => ({
  previewChannelMessageRecipients: (...args: unknown[]) => previewMock(...args),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    id: 1,
    role: 'admin',
    permissions: ['view_channels', 'send_messages'],
  }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
  useLocale: () => ({ locale: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: toastError, success: toastSuccess }),
}));

import { ChannelMessageComposer } from './channel-message-composer';

const previewOk = {
  ok: true as const,
  httpStatus: 200,
  preview: {
    presentation: 'preview' as const,
    recipient_summary: {
      total_people_count: 3,
      deliverable_user_count: 2,
      student_count: 1,
      guardian_count: 1,
      staff_count: 1,
      excluded_count: 0,
      can_submit: true,
      audience_labels: ['قسم'],
    },
  },
};

describe('ChannelMessageComposer', () => {
  beforeEach(() => {
    sendMock.mockReset();
    previewMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    previewMock.mockResolvedValue(previewOk);
  });

  afterEach(() => {
    cleanup();
  });

  it('triggers Preview first and does not Submit before confirm', async () => {
    const user = userEvent.setup();
    sendMock.mockResolvedValue({
      ok: true,
      outcome: {
        kind: 'published',
        httpStatus: 201,
        message: {
          id: 1,
          channel_id: 55,
          body: 'hello',
          body_html: 'hello',
          created_at: '2026-01-01',
          sender: { id: 1, name: 'A', role: 'admin' },
          is_pinned: false,
          is_important: false,
        },
      },
    });
    render(<ChannelMessageComposer channelId={55} canSend />);
    expect(previewMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('channels.writeMessage'), 'hello');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    await waitFor(() => expect(previewMock).toHaveBeenCalledTimes(1));
    expect(sendMock).not.toHaveBeenCalled();
    expect(previewMock).toHaveBeenCalledWith({
      role: 'admin',
      channelId: 55,
      body: 'hello',
    });
    expect(screen.getByText('communication.recipients.previewTitle')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('confirm triggers one Submit and clears body on success', async () => {
    const user = userEvent.setup();
    const onPending = vi.fn();
    sendMock.mockResolvedValue({
      ok: true,
      outcome: {
        kind: 'pending',
        httpStatus: 202,
        pending: {
          pending_review: true,
          communication_content_id: 34,
          channel_id: 55,
          communication_state: 'submitted',
          recipient_summary: { total_people_count: 3, is_frozen: true },
        },
      },
    });
    render(
      <ChannelMessageComposer channelId={55} canSend onPending={onPending} composeMode="submit" />,
    );
    await user.type(screen.getByLabelText('channels.writeMessage'), 'external');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'communication.recipients.confirmSend' })).toBeTruthy(),
    );
    await user.click(screen.getByRole('button', { name: 'communication.recipients.confirmSend' }));
    await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
    expect(onPending).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith('channels.pendingSubmittedNotice');
    expect((screen.getByLabelText('channels.writeMessage') as HTMLTextAreaElement).value).toBe('');
  });

  it('does not send when canSend is false', () => {
    render(<ChannelMessageComposer channelId={55} canSend={false} />);
    expect(screen.getByText('channels.compose.cannotSendSelected')).toBeTruthy();
    expect(previewMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('keeps text on preview failure and does not submit', async () => {
    const user = userEvent.setup();
    previewMock.mockResolvedValue({
      ok: false,
      httpStatus: 403,
      error: { code: 'forbidden', message: 'no', details: {} },
    });
    render(<ChannelMessageComposer channelId={55} canSend />);
    await user.type(screen.getByLabelText('channels.writeMessage'), 'keep me');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(sendMock).not.toHaveBeenCalled();
    expect((screen.getByLabelText('channels.writeMessage') as HTMLTextAreaElement).value).toBe(
      'keep me',
    );
  });

  it('keeps text on submit failure', async () => {
    const user = userEvent.setup();
    sendMock.mockResolvedValue({
      ok: false,
      error: { code: 'validation_error', message: 'fail', details: {} },
    });
    render(<ChannelMessageComposer channelId={55} canSend />);
    await user.type(screen.getByLabelText('channels.writeMessage'), 'keep me');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'communication.recipients.confirmSend' })).toBeTruthy(),
    );
    await user.click(screen.getByRole('button', { name: 'communication.recipients.confirmSend' }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect((screen.getByLabelText('channels.writeMessage') as HTMLTextAreaElement).value).toBe(
      'keep me',
    );
  });

  it('disables confirm when can_submit is false and shows blocking reasons', async () => {
    const user = userEvent.setup();
    previewMock.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      preview: {
        presentation: 'preview',
        recipient_summary: {
          can_submit: false,
          blocking_reasons: ['audience_empty'],
          total_people_count: 0,
        },
      },
    });
    render(<ChannelMessageComposer channelId={55} canSend />);
    await user.type(screen.getByLabelText('channels.writeMessage'), 'blocked');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    await waitFor(() =>
      expect(screen.getByText('communication.recipients.notReachable')).toBeTruthy(),
    );
    const confirm = screen.getByRole('button', {
      name: 'communication.recipients.confirmSend',
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('invalidates preview when body changes after preview', async () => {
    const user = userEvent.setup();
    render(<ChannelMessageComposer channelId={55} canSend />);
    await user.type(screen.getByLabelText('channels.writeMessage'), 'one');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'communication.recipients.confirmSend' })).toBeTruthy(),
    );
    await user.type(screen.getByLabelText('channels.writeMessage'), 'x');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'communication.recipients.confirmSend' })).toBeNull(),
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('prevents double preview while in flight', async () => {
    const user = userEvent.setup();
    let resolvePreview!: (value: unknown) => void;
    previewMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreview = resolve;
        }),
    );
    render(<ChannelMessageComposer channelId={55} canSend />);
    await user.type(screen.getByLabelText('channels.writeMessage'), 'once');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    expect(previewMock).toHaveBeenCalledTimes(1);
    const loadingBtn = screen.getByRole('button', {
      name: 'communication.recipients.previewLoading',
    }) as HTMLButtonElement;
    expect(loadingBtn.disabled).toBe(true);
    await user.click(loadingBtn);
    expect(previewMock).toHaveBeenCalledTimes(1);
    resolvePreview(previewOk);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'communication.recipients.confirmSend' })).toBeTruthy(),
    );
  });

  it('cancel closes preview without submit', async () => {
    const user = userEvent.setup();
    render(<ChannelMessageComposer channelId={55} canSend />);
    await user.type(screen.getByLabelText('channels.writeMessage'), 'stay');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'communication.recipients.confirmSend' })).toBeTruthy(),
    );
    await user.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(sendMock).not.toHaveBeenCalled();
    expect((screen.getByLabelText('channels.writeMessage') as HTMLTextAreaElement).value).toBe(
      'stay',
    );
  });
});
