// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/features/channels/api/send-channel-message', () => ({
  sendChannelMessage: (...args: unknown[]) => sendMock(...args),
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
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: toastError, success: toastSuccess }),
}));

import { ChannelMessageComposer } from './channel-message-composer';

describe('ChannelMessageComposer', () => {
  beforeEach(() => {
    sendMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not send until submit', async () => {
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
    expect(sendMock).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('channels.writeMessage'), 'hello');
    expect(sendMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith({
      role: 'admin',
      channelId: 55,
      body: 'hello',
    });
  });

  it('does not send when canSend is false', () => {
    render(<ChannelMessageComposer channelId={55} canSend={false} />);
    expect(screen.getByText('channels.compose.cannotSendSelected')).toBeTruthy();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('shows pending notice and clears form without calling onPublished', async () => {
    const user = userEvent.setup();
    const onPublished = vi.fn();
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
        },
      },
    });
    render(
      <ChannelMessageComposer
        channelId={55}
        canSend
        onPublished={onPublished}
        onPending={onPending}
      />,
    );
    await user.type(screen.getByLabelText('channels.writeMessage'), 'external');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    await waitFor(() => expect(onPending).toHaveBeenCalledTimes(1));
    expect(onPublished).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith('channels.pendingSubmittedNotice');
    expect((screen.getByLabelText('channels.writeMessage') as HTMLTextAreaElement).value).toBe('');
  });

  it('keeps text on failure', async () => {
    const user = userEvent.setup();
    sendMock.mockResolvedValue({
      ok: false,
      error: { code: 'validation_error', message: 'fail', details: {} },
    });
    render(<ChannelMessageComposer channelId={55} canSend />);
    await user.type(screen.getByLabelText('channels.writeMessage'), 'keep me');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect((screen.getByLabelText('channels.writeMessage') as HTMLTextAreaElement).value).toBe(
      'keep me',
    );
  });

  it('prevents double submit while in flight', async () => {
    const user = userEvent.setup();
    let resolveSend!: (value: unknown) => void;
    sendMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
    );
    render(<ChannelMessageComposer channelId={55} canSend />);
    await user.type(screen.getByLabelText('channels.writeMessage'), 'once');
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sendingBtn = screen.getByRole('button', { name: 'channels.sending' }) as HTMLButtonElement;
    expect(sendingBtn.disabled).toBe(true);
    await user.click(sendingBtn);
    expect(sendMock).toHaveBeenCalledTimes(1);
    resolveSend({
      ok: true,
      outcome: {
        kind: 'pending',
        httpStatus: 202,
        pending: {
          pending_review: true,
          communication_content_id: 1,
          channel_id: 55,
        },
      },
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });
});
