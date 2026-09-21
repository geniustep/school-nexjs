// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const labels: Record<string, string> = {
    'admin.parentProfile.activationLink.send': 'Send activation link by WhatsApp',
    'admin.parentProfile.activationLink.resend': 'Resend activation link',
    'admin.parentProfile.activationLink.sending': 'Sending activation link…',
    'admin.parentProfile.activationLink.sentSuccess': 'The activation link was sent by WhatsApp.',
    'admin.parentProfile.activationLink.resentSuccess': 'The activation link was resent by WhatsApp.',
    'admin.parentProfile.activationLink.genericError': 'The activation link could not be sent.',
    'admin.parentProfile.activationLink.permissionError': 'Permission denied.',
    'admin.parentProfile.activationLink.blockedError': 'Sending is blocked.',
    'admin.parentProfile.activationLink.conflictError': 'Send conflict.',
    'admin.parentProfile.activationLink.unavailableError': 'WhatsApp unavailable.',
    'admin.parentProfile.activationLink.networkError': 'Network unavailable.',
    'admin.parentProfile.activationLink.neverSent': 'No activation link has been sent yet.',
    'admin.parentProfile.activationLink.sentBefore': 'An activation link was sent before.',
    'admin.parentProfile.activationLink.lastSent': 'Last sent:',
    'admin.parentProfile.activationLink.neverLoggedIn': 'No account sign-in has been recorded yet.',
    'admin.parentProfile.activationLink.loggedIn': 'This guardian has used the account before.',
    'admin.parentProfile.activationLink.lastLogin': 'Last sign-in:',
    'admin.parentProfile.activationLink.confirmTitle': 'Resend activation link?',
    'admin.parentProfile.activationLink.confirmBody': 'This guardian already signed in.',
    'admin.parentProfile.activationLink.confirmAction': 'Resend link',
    'admin.parentProfile.activationLink.blockedNoActiveRelationship': 'No active relationship.',
    'admin.parentProfile.activationLink.blockedNotEligible': 'Guardian is not eligible.',
    'admin.parentProfile.activationLink.blockedCommunicationNotAllowed': 'Communication not allowed.',
    'admin.parentProfile.activationLink.blockedNoUserAccount': 'No login account.',
    'admin.parentProfile.activationLink.blockedInactiveUserAccount': 'Account inactive.',
    'admin.parentProfile.activationLink.blockedIdentityUnavailable': 'Activation identity incomplete.',
    'admin.parentProfile.activationLink.blockedWhatsAppUnavailable': 'WhatsApp send unavailable.',
    'admin.parentProfile.activationLink.blockedGeneric': 'Activation link cannot be sent.',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.submitting': 'Submitting…',
  };
  return {
    post: vi.fn(),
    refresh: vi.fn(),
    t: (key: string) => labels[key] ?? key,
  };
});

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => mocks.post(...args),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useLocale: () => ({ locale: 'en', t: mocks.t, dir: 'ltr', setLocale: vi.fn() }),
  useT: () => mocks.t,
}));

import { ParentAccountActivationLinkAction } from './parent-account-activation-link-action';

describe('ParentAccountActivationLinkAction', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.refresh.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows resend history and requires confirmation before sending for a used account', async () => {
    mocks.post.mockResolvedValue({ success: true, data: { status: 'queued' }, meta: {} });
    const onSent = vi.fn();

    render(
      <ParentAccountActivationLinkAction
        parentId={42}
        status={{
          can_send_activation_link: true,
          blocking_reason: null,
          sent_before: true,
          last_sent_at: '2026-09-21 12:00:00',
          has_logged_in: true,
          last_login_at: '2026-09-20 14:30:00',
        }}
        onSent={onSent}
      />,
    );

    expect(screen.getByText('An activation link was sent before.')).toBeTruthy();
    expect(screen.getByText('This guardian has used the account before.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Resend activation link' }));
    expect(mocks.post).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Resend link' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    const [path, payload] = mocks.post.mock.calls[0];
    expect(path).toBe('/admin/integrations/raqeem/messaging/account-activation-link');
    expect(payload).toEqual({
      parent_id: 42,
      idempotency_key: expect.any(String),
    });
    expect(Object.keys(payload as Record<string, unknown>).sort())
      .toEqual(['idempotency_key', 'parent_id']);
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
  });

  it('fails closed for an unknown blocker and never exposes its raw code', () => {
    render(
      <ParentAccountActivationLinkAction
        parentId={42}
        status={{
          can_send_activation_link: false,
          blocking_reason: 'future_sensitive_backend_reason',
          sent_before: false,
          has_logged_in: false,
        }}
      />,
    );

    const button = screen.getByRole('button', { name: 'Send activation link by WhatsApp' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Activation link cannot be sent.')).toBeTruthy();
    expect(screen.queryByText('future_sensitive_backend_reason')).toBeNull();
    fireEvent.click(button);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('blocks duplicate clicks while one request is in flight', async () => {
    const deferred: { resolve?: (value: unknown) => void } = {};
    mocks.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          deferred.resolve = resolve;
        }),
    );

    render(
      <ParentAccountActivationLinkAction
        parentId={42}
        status={{
          can_send_activation_link: true,
          blocking_reason: null,
          sent_before: false,
          has_logged_in: false,
        }}
      />,
    );

    const button = screen.getByRole('button', { name: 'Send activation link by WhatsApp' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.post).toHaveBeenCalledTimes(1);

    deferred.resolve?.({ success: true, data: { status: 'queued' }, meta: {} });
    await waitFor(() => expect(screen.getByText('The activation link was sent by WhatsApp.')).toBeTruthy());
  });

  it('reuses the same key after transient failure and creates a new key after success', async () => {
    mocks.post
      .mockResolvedValueOnce({
        success: false,
        error: { code: 'network_error', message: 'network', details: {} },
        meta: {},
      })
      .mockResolvedValueOnce({ success: true, data: { status: 'queued' }, meta: {} })
      .mockResolvedValueOnce({ success: true, data: { status: 'queued' }, meta: {} });

    const { rerender } = render(
      <ParentAccountActivationLinkAction
        parentId={42}
        status={{
          can_send_activation_link: true,
          blocking_reason: null,
          sent_before: false,
          has_logged_in: false,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send activation link by WhatsApp' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Send activation link by WhatsApp' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));

    const firstKey = (mocks.post.mock.calls[0][1] as { idempotency_key: string }).idempotency_key;
    const retryKey = (mocks.post.mock.calls[1][1] as { idempotency_key: string }).idempotency_key;
    expect(retryKey).toBe(firstKey);

    rerender(
      <ParentAccountActivationLinkAction
        parentId={42}
        status={{
          can_send_activation_link: true,
          blocking_reason: null,
          sent_before: true,
          has_logged_in: false,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resend activation link' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(3));

    const nextKey = (mocks.post.mock.calls[2][1] as { idempotency_key: string }).idempotency_key;
    expect(nextKey).not.toBe(firstKey);
  });
});
