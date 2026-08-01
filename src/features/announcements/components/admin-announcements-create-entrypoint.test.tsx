// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sessionRef = {
  current: {
    id: 1,
    role: 'admin' as const,
    name: 'Admin',
    login: 'admin',
    permissions: ['view_channels', 'view_dashboard'],
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

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => sessionRef.current,
}));

vi.mock('@/lib/permissions/scope', () => ({
  canSeeChannels: (user: { permissions?: string[] } | null) =>
    !!user?.permissions?.includes('view_channels'),
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

describe('AdminAnnouncementsPage create entrypoint', () => {
  afterEach(() => {
    cleanup();
    sessionRef.current = {
      id: 1,
      role: 'admin',
      name: 'Admin',
      login: 'admin',
      permissions: ['view_channels', 'view_dashboard'],
      admin_kind: 'school_admin',
    };
  });

  it('shows school communication title and create-message CTA to compose journey', () => {
    render(<AdminAnnouncementsPage />);

    expect(screen.getByText('channels.schoolCommunicationTitle')).toBeTruthy();
    expect(screen.getByText('announcements.adminWorkspaceSubtitle')).toBeTruthy();
    const createLink = screen.getByRole('link', { name: 'channels.createMessage' });
    expect(createLink.getAttribute('href')).toBe('/admin/channels/compose');
    expect(screen.getByTestId('announcements-feed').getAttribute('data-base-path')).toBe(
      '/admin/announcements',
    );
  });

  it('hides create CTA when view_channels is unavailable', () => {
    sessionRef.current = {
      ...sessionRef.current,
      permissions: ['view_dashboard'],
    };
    render(<AdminAnnouncementsPage />);
    expect(screen.queryByRole('link', { name: 'channels.createMessage' })).toBeNull();
  });
});

describe('Arabic admin announcements naming', () => {
  it('uses التواصل المدرسي as page domain label and create CTA', () => {
    expect(ar.channels.schoolCommunicationTitle).toBe('التواصل المدرسي');
    expect(ar.channels.createMessage).toBe('إنشاء رسالة');
    expect(ar.announcements.adminWorkspaceSubtitle).toContain('الرسائل المنشورة');
    expect(ar.announcements.adminWorkspaceSubtitle).not.toBe('الإعلانات');
  });

  it('does not use البلاغات المدرسية or الإعلانات as the domain page title', () => {
    expect(ar.channels.schoolCommunicationTitle).toBe('التواصل المدرسي');
    expect(ar.channels.schoolCommunicationTitle).not.toBe('الإعلانات');
    expect(ar.nav.schoolCommunication).toBe('التواصل المدرسي');
    expect(JSON.stringify(ar.announcements.adminWorkspaceSubtitle)).not.toContain(
      'البلاغات المدرسية',
    );
    expect(JSON.stringify(ar.nav)).not.toContain('البلاغات المدرسية');
  });
});
