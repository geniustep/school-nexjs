// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChannelRecipientCandidatesPayload } from '@/types/channel-recipient-candidates';

const postMock = vi.fn();
const getMock = vi.fn();
const searchParamsRef = { current: new URLSearchParams('studentId=2081') };

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsRef.current,
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
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    id: 1,
    role: 'admin',
    name: 'Admin',
    login: 'admin',
    permissions: ['view_channels', 'send_messages'],
  }),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 3, requiresActiveSchool: false }),
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

import { StudentChannelComposeWorkspace } from './student-channel-compose-workspace';

function candidates(
  partial: Partial<ChannelRecipientCandidatesPayload> = {},
): ChannelRecipientCandidatesPayload {
  const channels = partial.channels ?? [];
  return {
    student_id: 2081,
    recipient_kind: 'family',
    linked_guardian_user_count: 1,
    reason: null,
    ...partial,
    channels,
    channel_count: partial.channel_count ?? channels.length,
  };
}

function mockStudentOk() {
  getMock.mockImplementation(async (path: string) => {
    if (String(path).includes('/admin/students/')) {
      return {
        success: true,
        data: {
          student: {
            id: 2081,
            name_ar: 'أحمد مصطفى',
            name_latin: 'Ahmed Mostafa',
            status: 'active',
          },
        },
        meta: {},
      };
    }
    if (String(path).includes('recipient-candidates')) {
      return {
        success: true,
        data: candidates({
          reason: 'no_related_channels',
          channel_count: 0,
          channels: [],
        }),
        meta: {},
      };
    }
    return { success: false, error: { code: 'not_found', message: 'x' }, meta: {} };
  });
}

describe('StudentChannelComposeWorkspace', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    searchParamsRef.current = new URLSearchParams('studentId=2081');
  });

  afterEach(() => {
    cleanup();
  });

  it('does not fetch APIs for invalid studentId', async () => {
    searchParamsRef.current = new URLSearchParams('studentId=abc');
    render(<StudentChannelComposeWorkspace />);
    expect(await screen.findByText('channels.compose.invalidStudentIdTitle')).toBeTruthy();
    expect(getMock).not.toHaveBeenCalled();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('shows arabic + latin identity and no_related_channels empty state', async () => {
    mockStudentOk();
    render(<StudentChannelComposeWorkspace />);
    expect(await screen.findByText('أحمد مصطفى')).toBeTruthy();
    expect(screen.getByText('Ahmed Mostafa')).toBeTruthy();
    expect(await screen.findByText('channels.compose.noRelatedChannels')).toBeTruthy();
    expect(
      screen
        .getAllByRole('link', { name: 'channels.compose.openStudentProfile' })
        .every((el) => el.getAttribute('href') === '/admin/students/2081'),
    ).toBe(true);
    expect(screen.getAllByRole('link', { name: 'channels.compose.openChannels' }).length).toBeGreaterThan(
      0,
    );
    expect(postMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('channel-chat')).toBeNull();
  });

  it('shows no_linked_guardian_users reason', async () => {
    getMock.mockImplementation(async (path: string) => {
      if (String(path).includes('/admin/students/')) {
        return {
          success: true,
          data: { student: { id: 2081, name_ar: 'يوسف', status: 'active' } },
          meta: {},
        };
      }
      return {
        success: true,
        data: candidates({
          linked_guardian_user_count: 0,
          reason: 'no_linked_guardian_users',
          channel_count: 0,
          channels: [],
        }),
        meta: {},
      };
    });
    render(<StudentChannelComposeWorkspace />);
    expect(await screen.findByText('channels.compose.noLinkedGuardianUsers')).toBeTruthy();
  });

  it('shows no_safe_family_channel reason', async () => {
    getMock.mockImplementation(async (path: string) => {
      if (String(path).includes('/admin/students/')) {
        return {
          success: true,
          data: { student: { id: 2081, name_ar: 'يوسف', status: 'active' } },
          meta: {},
        };
      }
      return {
        success: true,
        data: candidates({
          reason: 'no_safe_family_channel',
          channel_count: 0,
          channels: [],
        }),
        meta: {},
      };
    });
    render(<StudentChannelComposeWorkspace />);
    expect(await screen.findByText('channels.compose.noSafeFamilyChannel')).toBeTruthy();
  });

  it('preselects a single writable candidate and mounts ChannelChat', async () => {
    getMock.mockImplementation(async (path: string) => {
      if (String(path).includes('/admin/students/')) {
        return {
          success: true,
          data: { student: { id: 2081, name_ar: 'أحمد', name_latin: 'Ahmed', status: 'active' } },
          meta: {},
        };
      }
      return {
        success: true,
        data: candidates({
          channels: [
            {
              id: 55,
              name: 'Family channel',
              type: 'private',
              member_count: 2,
              family_recipient_count: 1,
              can_send: true,
            },
          ],
        }),
        meta: {},
      };
    });
    render(<StudentChannelComposeWorkspace />);
    expect((await screen.findByTestId('channel-chat')).textContent).toBe('chat:55');
    expect(screen.queryByLabelText('channels.compose.selectChannel')).toBeNull();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('requires explicit selection for multiple candidates and does not mount chat early', async () => {
    getMock.mockImplementation(async (path: string) => {
      if (String(path).includes('/admin/students/')) {
        return {
          success: true,
          data: { student: { id: 2081, name_ar: 'أحمد', status: 'active' } },
          meta: {},
        };
      }
      return {
        success: true,
        data: candidates({
          channels: [
            {
              id: 1,
              name: 'A',
              type: 'private',
              member_count: 2,
              family_recipient_count: 1,
              can_send: true,
            },
            {
              id: 2,
              name: 'B',
              type: 'private',
              member_count: 2,
              family_recipient_count: 1,
              can_send: false,
            },
          ],
        }),
        meta: {},
      };
    });
    const user = userEvent.setup();
    render(<StudentChannelComposeWorkspace />);
    expect(await screen.findByLabelText('channels.compose.selectChannel')).toBeTruthy();
    expect(screen.queryByTestId('channel-chat')).toBeNull();
    await user.selectOptions(screen.getByLabelText('channels.compose.selectChannel'), '1');
    expect((await screen.findByTestId('channel-chat')).textContent).toBe('chat:1');
    expect(postMock).not.toHaveBeenCalled();
  });

  it('blocks composer for can_send=false candidate', async () => {
    getMock.mockImplementation(async (path: string) => {
      if (String(path).includes('/admin/students/')) {
        return {
          success: true,
          data: { student: { id: 2081, name_ar: 'أحمد', status: 'active' } },
          meta: {},
        };
      }
      return {
        success: true,
        data: candidates({
          channels: [
            {
              id: 77,
              name: 'Readonly family',
              type: 'private',
              member_count: 2,
              family_recipient_count: 1,
              can_send: false,
            },
          ],
        }),
        meta: {},
      };
    });
    render(<StudentChannelComposeWorkspace />);
    expect(await screen.findByText('channels.compose.cannotSendSelected')).toBeTruthy();
    expect(screen.queryByTestId('channel-chat')).toBeNull();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('does not POST while loading candidates', async () => {
    mockStudentOk();
    render(<StudentChannelComposeWorkspace />);
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(postMock).not.toHaveBeenCalled();
  });
});
