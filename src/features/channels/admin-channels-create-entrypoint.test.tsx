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

vi.mock('@/features/channels/admin-channels-workspace', () => ({
  AdminChannelsWorkspace: () => <div data-testid="admin-channels-workspace" />,
}));

import AdminChannelsPage from '@/app/admin/channels/page';
import ar from '../../../messages/ar.json';
import fr from '../../../messages/fr.json';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';

describe('AdminChannelsPage create entrypoint', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders admin channels workspace under view_channels gate', () => {
    render(<AdminChannelsPage />);
    expect(screen.getByTestId('admin-channels-workspace')).toBeTruthy();
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

  it('exposes channel lifecycle Arabic terms', () => {
    expect(ar.channels.lifecycle.create).toBe('إنشاء قناة');
    expect(ar.channels.lifecycle.delete).toBe('حذف القناة');
    expect(ar.channels.lifecycle.archiveInstead).toBe('أرشفة بدل الحذف');
    expect(ar.channels.lifecycle.badges.system).toBe('قناة نظامية');
    expect(ar.channels.lifecycle.badges.manual).toBe('قناة يدوية');
    expect(ar.channels.lifecycle.systemProtected).toContain('تُدار نظاميًا');
  });
});

describe('channel lifecycle i18n parity', () => {
  it('keeps lifecycle keys across ar/fr/en/es', () => {
    const arKeys = Object.keys(ar.channels.lifecycle.errors).sort();
    expect(Object.keys(fr.channels.lifecycle.errors).sort()).toEqual(arKeys);
    expect(Object.keys(en.channels.lifecycle.errors).sort()).toEqual(arKeys);
    expect(Object.keys(es.channels.lifecycle.errors).sort()).toEqual(arKeys);
    expect(fr.channels.type.class_staff).toBeTruthy();
    expect(en.channels.type.class_family).toBeTruthy();
    expect(es.channels.lifecycle.create).toBeTruthy();
  });
});
