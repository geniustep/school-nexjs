// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const listMock = vi.hoisted(() => vi.fn());

const sessionRef = {
  current: {
    id: 1,
    role: 'admin' as const,
    name: 'Admin',
    login: 'admin',
    permissions: ['view_channels', 'view_dashboard'],
    effective_capabilities: ['communication.content.view'],
    admin_kind: 'school_admin' as const,
  },
};

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

vi.mock('@/features/i18n/use-format', () => ({
  useFormat: () => ({ formatDateTime: (value: string) => value }),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => sessionRef.current,
}));

vi.mock('@/features/communication/api/admin-communication-api', () => ({
  fetchCommunicationContentList: listMock,
}));

vi.mock('@/lib/permissions/communication', () => ({
  COMMUNICATION_CAPABILITIES: { view: 'communication.content.view' },
  canComposeGeneralCommunication: (user: { permissions?: string[] } | null) =>
    !!user?.permissions?.includes('view_channels'),
  hasCommunicationCapability: (
    user: { effective_capabilities?: string[] } | null,
    code: string,
  ) => !!user?.effective_capabilities?.includes(code),
}));

vi.mock('@/features/announcements/components/announcements-recipient-feed', () => ({
  AnnouncementsRecipientFeed: ({
    title,
    subtitle,
    actions,
    basePath,
  }: {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    basePath: string;
  }) => (
    <div data-testid="announcements-feed" data-base-path={basePath}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-testid="feed-actions">{actions}</div>
    </div>
  ),
}));

import AdminAnnouncementsPage from '@/app/admin/announcements/page';
import ar from '../../../../messages/ar.json';

const announcement = {
  id: 10,
  school_id: 1,
  subject: 'Announcement A',
  content_type: 'announcement',
  state: 'published',
  channel_id: null,
  source_summary: null,
  author: { id: 1, name: 'Admin' },
  audience_summary: { label: 'Guardians' },
  published_at: '2026-08-08T00:00:00Z',
};

const pendingAnnouncement = {
  id: 13,
  school_id: 1,
  subject: 'Announcement Pending',
  content_type: 'announcement',
  state: 'submitted',
  channel_id: null,
  source_summary: null,
  author: { id: 1, name: 'Admin' },
  audience_summary: { label: 'Guardians' },
  submitted_at: '2026-08-08T00:03:00Z',
};

const editableAnnouncement = {
  id: 14,
  school_id: 1,
  subject: 'Announcement Needs Edit',
  content_type: 'announcement',
  state: 'changes_requested',
  channel_id: null,
  source_summary: null,
  author: { id: 1, name: 'Admin' },
  audience_summary: { label: 'Guardians' },
  allowed_actions: ['edit'],
  submitted_at: '2026-08-08T00:04:00Z',
};

const directMessage = {
  id: 11,
  school_id: 1,
  subject: 'Message B',
  content_type: 'message',
  state: 'published',
  channel_id: null,
  source_summary: null,
  author: { id: 1, name: 'Admin' },
  audience_summary: { label: 'Teacher' },
  published_at: '2026-08-08T00:01:00Z',
};

const channelMessage = {
  id: 12,
  school_id: 1,
  subject: 'Channel message',
  content_type: 'message',
  state: 'published',
  channel_id: 7,
  source_summary: { model: 'school.channel', res_id: 7 },
  author: { id: 1, name: 'Admin' },
  audience_summary: { label: 'Channel' },
  published_at: '2026-08-08T00:02:00Z',
};

describe('AdminAnnouncementsPage communication workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockImplementation((query: { content_type?: string }) => {
      if (query.content_type === 'announcement') {
        return Promise.resolve({
          success: true,
          data: [announcement, pendingAnnouncement, editableAnnouncement],
          meta: {},
        });
      }
      return Promise.resolve({
        success: true,
        data: [directMessage, channelMessage],
        meta: {},
      });
    });
  });

  afterEach(() => {
    cleanup();
    sessionRef.current = {
      id: 1,
      role: 'admin',
      name: 'Admin',
      login: 'admin',
      permissions: ['view_channels', 'view_dashboard'],
      effective_capabilities: ['communication.content.view'],
      admin_kind: 'school_admin',
    };
  });

  it('shows channel-less communication across workflow states while keeping channel messages separate', async () => {
    render(<AdminAnnouncementsPage />);

    expect(await screen.findByText('Announcement A')).toBeTruthy();
    expect(screen.getByText('Announcement Pending')).toBeTruthy();
    expect(screen.getByText('Announcement Needs Edit')).toBeTruthy();
    expect(screen.getByText('Message B')).toBeTruthy();
    expect(screen.queryByText('Channel message')).toBeNull();
    expect(screen.getByTestId('published-general-communication-feed')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Announcement A/ }).getAttribute('href'),
    ).toBe('/admin/communication/10');
    expect(screen.getByRole('link', { name: /Message B/ }).getAttribute('href')).toBe(
      '/admin/communication/11',
    );
    expect(screen.getByRole('link', { name: 'common.edit' }).getAttribute('href')).toBe(
      '/admin/communication/14#communication-edit',
    );

    fireEvent.click(
      screen.getByRole('tab', { name: /communication.contentType.message/ }),
    );
    expect(screen.queryByText('Announcement A')).toBeNull();
    expect(screen.queryByText('Announcement Pending')).toBeNull();
    expect(screen.getByText('Message B')).toBeTruthy();
  });

  it('does not force a published-state filter so newly submitted content can be found after create', async () => {
    render(<AdminAnnouncementsPage />);
    await screen.findByText('Announcement Pending');
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ content_type: 'announcement' }),
    );
    expect(listMock.mock.calls[0][0].state).toBeUndefined();
  });

  it('keeps the governed create entrypoint', async () => {
    render(<AdminAnnouncementsPage />);
    await screen.findByText('Announcement A');
    const createLink = screen.getByRole('link', {
      name: 'communication.general.newCommunication',
    });
    expect(createLink.getAttribute('href')).toBe('/admin/communication/compose');
  });

  it('falls back to the recipient announcement feed when content-view capability is unavailable', () => {
    sessionRef.current = {
      ...sessionRef.current,
      effective_capabilities: [],
    };
    render(<AdminAnnouncementsPage />);
    expect(screen.getByTestId('announcements-feed').getAttribute('data-base-path')).toBe(
      '/admin/announcements',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('hides create CTA when general communication compose is unavailable', () => {
    sessionRef.current = {
      ...sessionRef.current,
      permissions: ['view_dashboard'],
      effective_capabilities: [],
    };
    render(<AdminAnnouncementsPage />);
    expect(
      screen.queryByRole('link', { name: 'communication.general.newCommunication' }),
    ).toBeNull();
  });
});

describe('Arabic admin announcements naming', () => {
  it('keeps التواصل المدرسي as the page domain and uses a neutral create CTA', () => {
    expect(ar.channels.schoolCommunicationTitle).toBe('التواصل المدرسي');
    expect(ar.communication.general.newCommunication).toBe('تواصل جديد');
  });

  it('does not use البلاغات المدرسية as the domain page title', () => {
    expect(ar.channels.schoolCommunicationTitle).not.toBe('البلاغات المدرسية');
    expect(ar.nav.schoolCommunication).toBe('التواصل المدرسي');
    expect(JSON.stringify(ar.nav)).not.toContain('البلاغات المدرسية');
  });
});
