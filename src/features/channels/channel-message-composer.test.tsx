// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
    get: vi.fn(),
  },
}));

vi.mock('@/lib/api/channel-endpoints', () => ({
  channelsEndpointsForRole: () => ({
    list: '/admin/channels',
    detail: (id: number) => `/admin/channels/${id}`,
    messages: (id: number) => `/admin/channels/${id}/messages`,
  }),
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
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

import { ChannelMessageComposer } from './channel-message-composer';

describe('ChannelMessageComposer', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not POST until submit', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      success: true,
      data: { id: 1, body: 'hello', created_at: '2026-01-01', sender: { id: 1, name: 'A', role: 'admin' } },
      meta: {},
    });
    render(<ChannelMessageComposer channelId={55} canSend />);
    expect(postMock).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('channels.writeMessage'), 'hello');
    expect(postMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'channels.send' }));
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/admin/channels/55/messages', { body: 'hello' });
  });

  it('does not POST when canSend is false', () => {
    render(<ChannelMessageComposer channelId={55} canSend={false} />);
    expect(screen.getByText('channels.compose.cannotSendSelected')).toBeTruthy();
    expect(postMock).not.toHaveBeenCalled();
  });
});
