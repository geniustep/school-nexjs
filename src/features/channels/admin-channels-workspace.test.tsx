// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const deleteMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

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

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError, info: vi.fn() }),
}));

vi.mock('@/features/auth/active-role-context', () => ({
  useActiveRole: () => ({ activeRole: 'admin' }),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({
    activeSchoolId: 1,
    requiresActiveSchool: false,
    schools: [{ id: 1, name: 'School' }],
    switching: false,
  }),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

import { AdminChannelsWorkspace } from './admin-channels-workspace';

const baseChannel: Record<string, unknown> = {
  id: 10,
  name: 'قناة يدوية',
  type: 'teachers',
  channel_type: 'teachers',
  description: 'وصف',
  audience: 'teachers',
  read_only: false,
  can_send: true,
  unread_count: 0,
  member_count: 0,
  last_message_date: null,
  is_system_managed: false,
  is_archived: false,
  allow_attachments: true,
  notify_email: false,
  has_history: false,
  allowed_actions: {
    view: true,
    send_message: true,
    update: true,
    delete: true,
    archive: true,
    restore: false,
  },
  blocking_reasons: [],
};

function mockList(channels = [baseChannel], createAllowed = true) {
  getMock.mockImplementation((path: string) => {
    if (String(path).includes('/admin/classes')) {
      return Promise.resolve({
        success: true,
        data: [{ id: 40, name: '6A' }],
        meta: {},
      });
    }
    return Promise.resolve({
      success: true,
      data: channels,
      meta: { allowed_actions: { create_channel: createAllowed } },
    });
  });
}

describe('AdminChannelsWorkspace lifecycle UI', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockList();
  });

  it('shows create channel only when meta.allowed_actions.create_channel', async () => {
    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByText('قناة يدوية')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'channels.lifecycle.create' })).toBeTruthy();
    expect(getMock).toHaveBeenCalledWith(
      '/admin/channels',
      expect.objectContaining({
        include_archived: 'true',
        include_family_audience: '1',
        page_size: 100,
        active_school_id: 1,
      }),
    );

    cleanup();
    mockList([baseChannel], false);
    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByText('قناة يدوية')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'channels.lifecycle.create' })).toBeNull();
    expect(screen.getByRole('link', { name: 'channels.createMessage' })).toBeTruthy();
  });

  it('presents class_family audience without misleading member_count zero', async () => {
    mockList([
      {
        ...baseChannel,
        id: 31,
        name: 'أسر القسم',
        type: 'class_family',
        channel_type: 'class_family',
        is_system_managed: true,
        member_count: 0,
        family_audience_summary: {
          student_count: 8,
          guardian_count: 8,
          deliverable_user_count: 5,
          excluded_count: 3,
          delivery_state: 'partial',
          exclusion_summary: [{ code: 'missing_portal_user', count: 3 }],
        },
        allowed_actions: {
          view: true,
          send_message: true,
          update: true,
          delete: false,
          archive: false,
          restore: false,
        },
      },
      {
        ...baseChannel,
        id: 30,
        name: 'طاقم القسم',
        type: 'class_staff',
        channel_type: 'class_staff',
        is_system_managed: true,
        member_count: 4,
        family_audience_summary: null,
        allowed_actions: {
          view: true,
          send_message: true,
          update: true,
          delete: false,
          archive: false,
          restore: false,
        },
      },
    ]);
    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByTestId('admin-channel-card-31')).toBeTruthy());
    const familyCard = screen.getByTestId('admin-channel-card-31');
    expect(within(familyCard).getByTestId('channel-audience-family')).toBeTruthy();
    expect(within(familyCard).getByText('channels.audience.badges.partial')).toBeTruthy();
    expect(within(familyCard).queryByText(/^0 /)).toBeNull();
    expect(within(familyCard).queryByText('missing_portal_user')).toBeNull();

    const staffCard = screen.getByTestId('admin-channel-card-30');
    expect(within(staffCard).getByTestId('channel-audience-staff')).toBeTruthy();
  });

  it('opens create dialog and submits allowlisted payload without school_id', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      success: true,
      data: { ...baseChannel, id: 99, name: 'جديدة' },
      meta: {},
    });
    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByText('قناة يدوية')).toBeTruthy());

    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.create' }));
    expect(screen.getByTestId('channel-form-dialog')).toBeTruthy();

    await user.type(screen.getByLabelText('channels.lifecycle.name'), 'جديدة');
    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.createSubmit' }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const [, body] = postMock.mock.calls[0];
    expect(body).toMatchObject({
      name: 'جديدة',
      channel_type: 'teachers',
    });
    expect(body).not.toHaveProperty('school_id');
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('shows update/delete from allowed_actions and confirms delete without optimistic removal', async () => {
    const user = userEvent.setup();
    deleteMock.mockResolvedValue({
      success: true,
      data: { action: 'deleted', id: 10 },
      meta: {},
    });
    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByTestId('admin-channel-card-10')).toBeTruthy());

    const card = screen.getByTestId('admin-channel-card-10');
    expect(within(card).getByText('قناة يدوية')).toBeTruthy();

    await user.click(within(card).getByLabelText('channels.lifecycle.actionsMenu'));
    expect(screen.getByRole('menuitem', { name: 'channels.lifecycle.edit' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'channels.lifecycle.delete' })).toBeTruthy();

    await user.click(screen.getByRole('menuitem', { name: 'channels.lifecycle.delete' }));
    expect(screen.getByTestId('channel-delete-dialog')).toBeTruthy();
    expect(screen.getByTestId('admin-channel-card-10')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.deleteConfirm' }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('/admin/channels/10', { active_school_id: 1 }));
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('surfaces 409 blocking_reasons and archive fallback only when allowed', async () => {
    const user = userEvent.setup();
    deleteMock.mockResolvedValue({
      success: false,
      error: {
        code: 'communication_channel_delete_blocked',
        message: 'blocked',
        details: {
          status: 409,
          blocking_reasons: [{ code: 'channel_has_communication_history' }],
          allowed_actions: { archive: true, delete: false },
        },
      },
      meta: {},
    });
    postMock.mockResolvedValue({
      success: true,
      data: { ...baseChannel, is_archived: true },
      meta: {},
    });

    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByTestId('admin-channel-card-10')).toBeTruthy());
    await user.click(screen.getByLabelText('channels.lifecycle.actionsMenu'));
    await user.click(screen.getByRole('menuitem', { name: 'channels.lifecycle.delete' }));
    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.deleteConfirm' }));

    await waitFor(() =>
      expect(screen.getByText('channels.lifecycle.errors.deleteBlocked')).toBeTruthy(),
    );
    expect(screen.getByText('channels.lifecycle.errors.hasHistory')).toBeTruthy();
    expect(screen.getByTestId('channel-delete-dialog')).toBeTruthy();
    expect(screen.getByTestId('admin-channel-card-10')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.archiveInstead' }));
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/admin/channels/10/archive', {}, { active_school_id: 1 }),
    );
  });

  it('shows archived badge and restore action from allowed_actions only', async () => {
    const user = userEvent.setup();
    mockList([
      {
        ...baseChannel,
        is_archived: true,
        allowed_actions: {
          view: true,
          send_message: false,
          update: false,
          delete: false,
          archive: false,
          restore: true,
        },
      },
    ]);
    postMock.mockResolvedValue({
      success: true,
      data: { ...baseChannel, is_archived: false },
      meta: {},
    });

    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByText('channels.lifecycle.badges.archived')).toBeTruthy());
    await user.click(screen.getByLabelText('channels.lifecycle.actionsMenu'));
    expect(screen.queryByRole('menuitem', { name: 'channels.lifecycle.archive' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'channels.lifecycle.restore' })).toBeTruthy();
    await user.click(screen.getByRole('menuitem', { name: 'channels.lifecycle.restore' }));
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/admin/channels/10/restore', {}, { active_school_id: 1 }),
    );
  });

  it('renders system/manual badges, long dir=auto names, and empty create CTA', async () => {
    mockList([
      {
        ...baseChannel,
        id: 1,
        name: 'قناة نظامية طويلة جدًا للتحقق من الاتجاه التلقائي والالتفاف على الهاتف',
        channel_type: 'class_staff',
        type: 'class_staff',
        is_system_managed: true,
        class: { id: 40, name: '6A' },
        academic_year: { id: 9, name: '2025-2026' },
        allowed_actions: {
          view: true,
          send_message: true,
          update: true,
          delete: false,
          archive: false,
          restore: false,
        },
      } as typeof baseChannel,
      baseChannel,
    ]);
    const { container } = render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByTestId('admin-channel-card-1')).toBeTruthy());
    expect(screen.getByText('channels.lifecycle.badges.system')).toBeTruthy();
    expect(screen.getByText('channels.lifecycle.badges.manual')).toBeTruthy();
    expect(screen.getByText('channels.lifecycle.badges.staff')).toBeTruthy();
    const name = container.querySelector('.channels-list__name');
    expect(name?.getAttribute('dir')).toBe('auto');
    expect(container.querySelector('.channels-lifecycle-card')).toBeTruthy();

    cleanup();
    getMock.mockImplementation((path: string) => {
      if (String(path).includes('/admin/classes')) {
        return Promise.resolve({ success: true, data: [], meta: {} });
      }
      return Promise.resolve({
        success: true,
        data: [],
        meta: { allowed_actions: { create_channel: true } },
      });
    });
    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByText('channels.emptyTitle')).toBeTruthy());
    expect(screen.getAllByRole('button', { name: 'channels.lifecycle.create' }).length).toBeGreaterThan(0);
  });

  it('supports keyboard Escape on actions menu and keeps card on multi-reason 409', async () => {
    const user = userEvent.setup();
    deleteMock.mockResolvedValue({
      success: false,
      error: {
        code: 'communication_channel_delete_blocked',
        message: 'blocked',
        details: {
          status: 409,
          blocking_reasons: [
            { code: 'channel_has_communication_history' },
            { code: 'system_channel_delete_forbidden' },
          ],
          allowed_actions: { archive: false, delete: false },
        },
      },
      meta: {},
    });
    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByTestId('admin-channel-card-10')).toBeTruthy());
    const trigger = screen.getByLabelText('channels.lifecycle.actionsMenu');
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'channels.lifecycle.delete' }));
    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.deleteConfirm' }));
    await waitFor(() =>
      expect(screen.getByText('channels.lifecycle.errors.hasHistory')).toBeTruthy(),
    );
    expect(screen.getByText('channels.lifecycle.errors.systemChannelDeleteForbidden')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'channels.lifecycle.archiveInstead' })).toBeNull();
    expect(screen.getByTestId('admin-channel-card-10')).toBeTruthy();
  });

  it('opens update dialog without channel_type editor and confirms archive', async () => {
    const user = userEvent.setup();
    patchMock.mockResolvedValue({
      success: true,
      data: { ...baseChannel, description: 'محدث' },
      meta: {},
    });
    postMock.mockResolvedValue({
      success: true,
      data: { ...baseChannel, is_archived: true },
      meta: {},
    });
    render(<AdminChannelsWorkspace />);
    await waitFor(() => expect(screen.getByTestId('admin-channel-card-10')).toBeTruthy());
    await user.click(screen.getByLabelText('channels.lifecycle.actionsMenu'));
    await user.click(screen.getByRole('menuitem', { name: 'channels.lifecycle.edit' }));
    expect(screen.getByTestId('channel-form-dialog')).toBeTruthy();
    expect(screen.queryByLabelText('channels.lifecycle.channelType')).toBeNull();
    await user.clear(screen.getByLabelText('channels.lifecycle.description'));
    await user.type(screen.getByLabelText('channels.lifecycle.description'), 'محدث');
    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.saveChanges' }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    const patchBody = patchMock.mock.calls[0][1];
    expect(patchBody).not.toHaveProperty('channel_type');
    expect(patchBody).not.toHaveProperty('school_id');
    expect(patchBody).not.toHaveProperty('is_system_managed');

    await user.click(screen.getByLabelText('channels.lifecycle.actionsMenu'));
    await user.click(screen.getByRole('menuitem', { name: 'channels.lifecycle.archive' }));
    expect(screen.getByText('channels.lifecycle.archiveWarning')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.archive' }));
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/admin/channels/10/archive', {}, { active_school_id: 1 }),
    );
  });
});
