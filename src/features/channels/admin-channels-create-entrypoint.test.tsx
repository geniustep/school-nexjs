// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/components/admin/require-admin-permission', () => ({
  RequireAdminPermission: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/channels/channels-list', () => ({
  ChannelsList: () => <div data-testid="channels-list" />,
}));

import AdminChannelsPage from '@/app/admin/channels/page';
import ar from '../../../messages/ar.json';

describe('AdminChannelsPage create entrypoint', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows school communication title and create-message CTA', () => {
    render(<AdminChannelsPage />);

    expect(screen.getByText('channels.schoolCommunicationTitle')).toBeTruthy();
    const createLink = screen.getByRole('link', { name: 'channels.createMessage' });
    expect(createLink.getAttribute('href')).toBe('/admin/channels/compose');
    expect(screen.getByTestId('channels-list')).toBeTruthy();
  });
});

describe('Arabic school communication naming', () => {
  it('uses التواصل المدرسي as domain labels and create-message CTA', () => {
    expect(ar.nav.communication).toBe('التواصل المدرسي');
    expect(ar.nav.schoolCommunication).toBe('التواصل المدرسي');
    expect(ar.nav.adminScopedCommunication).toBe('التواصل المدرسي (نطاق محدود)');
    expect(ar.channels.schoolCommunicationTitle).toBe('التواصل المدرسي');
    expect(ar.channels.createMessage).toBe('إنشاء رسالة');
  });

  it('does not use البلاغات المدرسية or الإعلانات as domain section titles', () => {
    expect(ar.nav.communication).not.toBe('الإعلانات');
    expect(ar.nav.communication).not.toContain('البلاغات');
    expect(ar.nav.schoolCommunication).not.toBe('الإعلانات');
    expect(ar.channels.schoolCommunicationTitle).not.toBe('الإعلانات');
    expect(JSON.stringify(ar.nav)).not.toContain('البلاغات المدرسية');
    expect(JSON.stringify(ar.channels)).not.toContain('البلاغات المدرسية');
  });
});
