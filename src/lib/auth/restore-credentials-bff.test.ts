import { describe, expect, it } from 'vitest';
import {
  extractOdooSessionId,
  parseRestoreCredentialBody,
  resolveRestoreCredentialRoute,
  restoreCredentialOdooPath,
  restoreCredentialRouteRequiresSession,
} from './restore-credentials-bff';

describe('restore credentials BFF route contract', () => {
  it('accepts only the five governed route shapes', () => {
    expect(resolveRestoreCredentialRoute(['registration', 'options'])).toBe('registration/options');
    expect(resolveRestoreCredentialRoute(['registration', 'verify'])).toBe('registration/verify');
    expect(resolveRestoreCredentialRoute(['authentication', 'options'])).toBe('authentication/options');
    expect(resolveRestoreCredentialRoute(['authentication', 'verify'])).toBe('authentication/verify');
    expect(resolveRestoreCredentialRoute(['revoke'])).toBe('revoke');

    expect(resolveRestoreCredentialRoute(['authentication'])).toBeNull();
    expect(resolveRestoreCredentialRoute(['authentication', 'verify', 'extra'])).toBeNull();
    expect(resolveRestoreCredentialRoute(['admin', 'anything'])).toBeNull();
  });

  it('maps routes only to the Odoo Restore Credentials namespace', () => {
    expect(restoreCredentialOdooPath('registration/options')).toBe(
      '/auth/restore-credentials/registration/options',
    );
    expect(restoreCredentialOdooPath('authentication/verify')).toBe(
      '/auth/restore-credentials/authentication/verify',
    );
    expect(restoreCredentialOdooPath('revoke')).toBe('/auth/restore-credentials/revoke');
  });

  it('requires an existing session only for registration and revoke', () => {
    expect(restoreCredentialRouteRequiresSession('registration/options')).toBe(true);
    expect(restoreCredentialRouteRequiresSession('registration/verify')).toBe(true);
    expect(restoreCredentialRouteRequiresSession('revoke')).toBe(true);
    expect(restoreCredentialRouteRequiresSession('authentication/options')).toBe(false);
    expect(restoreCredentialRouteRequiresSession('authentication/verify')).toBe(false);
  });
});

describe('parseRestoreCredentialBody', () => {
  it('accepts empty options bodies and rejects identity injection', () => {
    expect(parseRestoreCredentialBody('registration/options', {})).toEqual({ ok: true, body: {} });
    expect(parseRestoreCredentialBody('authentication/options', {})).toEqual({ ok: true, body: {} });

    expect(parseRestoreCredentialBody('authentication/options', { user_id: 42 })).toEqual({ ok: false });
    expect(parseRestoreCredentialBody('registration/options', { db: 'school' })).toEqual({ ok: false });
  });

  it('accepts only challenge_id plus an opaque credential object for verify', () => {
    const credential = { id: 'credential-1', response: { clientDataJSON: 'abc' } };
    expect(
      parseRestoreCredentialBody('authentication/verify', {
        challenge_id: ' challenge-1 ',
        credential,
      }),
    ).toEqual({
      ok: true,
      body: { challenge_id: 'challenge-1', credential },
    });

    expect(
      parseRestoreCredentialBody('registration/verify', {
        challenge_id: 'challenge-1',
        credential,
        role: 'admin',
      }),
    ).toEqual({ ok: false });
    expect(
      parseRestoreCredentialBody('authentication/verify', {
        challenge_id: '',
        credential,
      }),
    ).toEqual({ ok: false });
    expect(
      parseRestoreCredentialBody('authentication/verify', {
        challenge_id: 'challenge-1',
        credential: 'not-an-object',
      }),
    ).toEqual({ ok: false });
  });

  it('accepts bounded revoke inputs and rejects unknown keys', () => {
    expect(parseRestoreCredentialBody('revoke', { credential_id: ' credential-1 ' })).toEqual({
      ok: true,
      body: { credential_id: 'credential-1' },
    });
    expect(parseRestoreCredentialBody('revoke', { revoke_all: true })).toEqual({
      ok: true,
      body: { revoke_all: true },
    });
    expect(parseRestoreCredentialBody('revoke', {})).toEqual({ ok: false });
    expect(parseRestoreCredentialBody('revoke', { user_id: 1, revoke_all: true })).toEqual({ ok: false });
  });
});

describe('extractOdooSessionId', () => {
  it('extracts only the Odoo session_id cookie', () => {
    expect(extractOdooSessionId('session_id=abc123; Path=/; HttpOnly')).toBe('abc123');
    expect(
      extractOdooSessionId('frontend_lang=en_US; Path=/, session_id=restore-session; Path=/; HttpOnly'),
    ).toBe('restore-session');
  });

  it('fails closed when the upstream session cookie is absent', () => {
    expect(extractOdooSessionId(null)).toBeNull();
    expect(extractOdooSessionId('frontend_lang=en_US; Path=/')).toBeNull();
  });
});
