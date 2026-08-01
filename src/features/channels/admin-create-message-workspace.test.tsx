// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Channel } from '@/types/channel';

const getMock = vi.fn();
const searchParamsRef = { current: new URLSearchParams('') };

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsRef.current,
  usePathname: () => '/admin/channels/compose',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
  },
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    id: 1,
    role: 'admin',
    name: 'Admin',
    login: 'admin',
    permissions: ['view_channels'],
  }),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({
    activeSchoolId: 3,
    requiresActiveSchool: false,
    schools: [{ id: 3 }],
    switching: false,
  }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

vi.mock('./channel-chat', () => ({
  ChannelChat: ({ channelId }: { channelId: number }) => (
    <div data-testid="channel-chat">chat:{channelId}</div>
  ),
}));

import { AdminCreateMessageWorkspace } from './admin-create-message-workspace';

function channel(partial: Partial<Channel> & Pick<Channel, 'id' | 'name'>): Channel {
  return {
    type: 'teachers',
    description: null,
    audience: null,
    read_only: false,
    can_send: true,
    unread_count: 0,
    member_count: 2,
    last_message_date: null,
    allowed_message_actions: ['send_internal'],
    ...partial,
  };
}

function mockChannels(rows: Channel[]) {
  getMock.mockImplementation(async (path: string) => {
    if (String(path).includes('/admin/channels')) {
      return { success: true, data: rows, meta: {} };
    }
    return { success: false, error: { code: 'not_found', message: 'x' } };
  });
}

describe('AdminCreateMessageWorkspace', () => {
  beforeEach(() => {
    getMock.mockReset();
    searchParamsRef.current = new URLSearchParams('');
  });

  afterEach(() => {
    cleanup();
  });

  it('shows empty state when no sendable channel exists', async () => {
    mockChannels([
      channel({
        id: 1,
        name: 'View only',
        can_send: false,
      }),
    ]);

    render(<AdminCreateMessageWorkspace />);

    expect(await screen.findByText('channels.compose.noSendableChannelTitle')).toBeTruthy();
    expect(screen.queryByTestId('channel-chat')).toBeNull();
  });

  it('opens composer when a single sendable channel exists', async () => {
    mockChannels([
      channel({ id: 11, name: 'Staff only', is_internal_staff_only: true }),
      channel({ id: 12, name: 'Blocked', can_send: false }),
    ]);

    render(<AdminCreateMessageWorkspace />);

    expect((await screen.findByTestId('channel-chat')).textContent).toBe('chat:11');
    expect(screen.queryByLabelText('channels.compose.selectChannel')).toBeNull();
  });

  it('requires channel selection when multiple sendable channels exist', async () => {
    const user = userEvent.setup();
    mockChannels([
      channel({ id: 21, name: 'Alpha', allowed_message_actions: ['send_internal'] }),
      channel({ id: 22, name: 'Beta', allowed_message_actions: ['submit_message'] }),
    ]);

    render(<AdminCreateMessageWorkspace />);

    expect(await screen.findByText('channels.compose.selectChannelHint')).toBeTruthy();
    expect(screen.queryByTestId('channel-chat')).toBeNull();

    await user.selectOptions(
      screen.getByLabelText('channels.compose.selectChannel'),
      '22',
    );

    await waitFor(() => {
      expect(screen.getByTestId('channel-chat').textContent).toBe('chat:22');
    });
  });

  it('does not treat non-sendable channels as selectable options', async () => {
    mockChannels([
      channel({ id: 31, name: 'Writable' }),
      channel({ id: 32, name: 'Hidden', can_send: false }),
      channel({
        id: 33,
        name: 'Also writable',
        allowed_message_actions: ['submit_message'],
      }),
    ]);

    render(<AdminCreateMessageWorkspace />);

    const select = await screen.findByLabelText('channels.compose.selectChannel');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('Writable');
    expect(options).toContain('Also writable');
    expect(options).not.toContain('Hidden');
  });

  it('blocks deep-linked channelId that is not sendable', async () => {
    searchParamsRef.current = new URLSearchParams('channelId=99');
    mockChannels([
      channel({ id: 99, name: 'Locked', can_send: false }),
      channel({ id: 100, name: 'Open' }),
      channel({ id: 101, name: 'Open 2' }),
    ]);

    render(<AdminCreateMessageWorkspace />);

    expect(await screen.findByText('channels.compose.cannotSendSelected')).toBeTruthy();
    expect(screen.queryByTestId('channel-chat')).toBeNull();
  });

  it('shows create-message title key for school communication journey', async () => {
    mockChannels([channel({ id: 1, name: 'Only' })]);
    render(<AdminCreateMessageWorkspace />);
    expect(await screen.findByText('channels.createMessage')).toBeTruthy();
  });
});
