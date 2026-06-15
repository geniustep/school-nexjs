import { describe, expect, it } from 'vitest';
import { mapAccountApiError, mapAccountWarning } from '@/lib/account/account-errors';
import {
  buildAccountIdentityPayload,
  buildActivateAccountPayload,
  normalizeAccountInfo,
  resolveAccountStatus,
  validateActivateAccountInput,
  validateCreateAccountInput,
} from '@/lib/account/account-utils';

const t = (key: string) => `__${key}__`;

describe('buildAccountIdentityPayload', () => {
  it('create sends email only when login is not custom', () => {
    expect(
      buildAccountIdentityPayload({
        email: 'teacher@school.ma',
        login: '',
        useDifferentLogin: false,
        isCreate: true,
      }),
    ).toEqual({ email: 'teacher@school.ma' });
  });

  it('create sends explicit login when custom login enabled', () => {
    expect(
      buildAccountIdentityPayload({
        email: 'teacher@school.ma',
        login: 'custom-login',
        useDifferentLogin: true,
        isCreate: true,
      }),
    ).toEqual({ email: 'teacher@school.ma', login: 'custom-login' });
  });

  it('update email only does not send stale login', () => {
    expect(
      buildAccountIdentityPayload({
        email: 'new@example.com',
        login: 'old@example.com',
        originalEmail: 'old@example.com',
        originalLogin: 'old@example.com',
        useDifferentLogin: false,
        isCreate: false,
      }),
    ).toEqual({ email: 'new@example.com' });
  });

  it('update login only sends login', () => {
    expect(
      buildAccountIdentityPayload({
        email: 'same@example.com',
        login: 'new-login',
        originalEmail: 'same@example.com',
        originalLogin: 'old-login',
        useDifferentLogin: true,
        isCreate: false,
      }),
    ).toEqual({ login: 'new-login' });
  });

  it('update email and login sends both dirty fields', () => {
    expect(
      buildAccountIdentityPayload({
        email: 'new@example.com',
        login: 'new-login',
        originalEmail: 'old@example.com',
        originalLogin: 'old-login',
        useDifferentLogin: true,
        isCreate: false,
      }),
    ).toEqual({ email: 'new@example.com', login: 'new-login' });
  });
});

describe('buildActivateAccountPayload', () => {
  it('builds student/parent activation payload with password', () => {
    expect(
      buildActivateAccountPayload({
        email: 'student@school.ma',
        login: '',
        password: 'SecurePass123!',
        sendInvite: false,
        mustChangePassword: true,
      }),
    ).toEqual({
      email: 'student@school.ma',
      password: 'SecurePass123!',
      send_invite: false,
      must_change_password: true,
    });
  });

  it('allows login-only activation with password', () => {
    expect(
      buildActivateAccountPayload({
        email: '',
        login: 'abdel',
        password: 'SecurePass123!',
        sendInvite: false,
      }),
    ).toEqual({
      login: 'abdel',
      password: 'SecurePass123!',
      send_invite: false,
    });
  });
});

describe('validation', () => {
  it('requires email or login for activation', () => {
    expect(validateActivateAccountInput('', '')).toBe(false);
    expect(validateActivateAccountInput('a@b.c', '')).toBe(true);
    expect(validateActivateAccountInput('', 'abdel')).toBe(true);
  });

  it('requires email or login for staff create', () => {
    expect(validateCreateAccountInput('', '', false)).toBe(false);
    expect(validateCreateAccountInput('a@b.c', '', false)).toBe(true);
    expect(validateCreateAccountInput('', 'abdel', true)).toBe(true);
  });
});

describe('normalizeAccountInfo', () => {
  it('returns not_created when no user_id', () => {
    expect(resolveAccountStatus({ email: 'a@b.c' })).toBe('not_created');
  });

  it('normalizes account block from backend', () => {
    expect(
      normalizeAccountInfo({
        account: {
          user_id: 7,
          status: 'active',
          login: 'abdel',
          login_synced_with_email: false,
        },
      }),
    ).toEqual({
      user_id: 7,
      status: 'active',
      login: 'abdel',
      login_synced_with_email: false,
    });
  });
});

describe('account errors and warnings', () => {
  it('maps duplicate_login', () => {
    expect(mapAccountApiError({ code: 'duplicate_login', message: '', details: {} }, t)).toBe(
      '__admin.account.errors.duplicateLogin__',
    );
  });

  it('maps custom_login_preserved warning', () => {
    expect(mapAccountWarning({ code: 'custom_login_preserved' }, t)).toBe(
      '__admin.account.warnings.customLoginPreserved__',
    );
  });
});
