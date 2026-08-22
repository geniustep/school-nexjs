import { describe, expect, it } from 'vitest';
import { isAccountActivationLinkToken, parseAccountActivationLinkPayload } from './account-activation-link';

const TOKEN = 'school.selector_123.secret-456';

describe('account activation link payload', () => {
  it('accepts the exact inspect and complete contracts', () => {
    expect(parseAccountActivationLinkPayload('inspect', { token: TOKEN }))
      .toEqual({ ok: true, body: { token: TOKEN } });
    expect(parseAccountActivationLinkPayload('complete', { token: TOKEN, password: 'Strong password 123!' }))
      .toEqual({ ok: true, body: { token: TOKEN, password: 'Strong password 123!' } });
  });

  it('rejects legacy, encoded, URL and cross-shape tokens', () => {
    for (const token of ['selector.secret', 'School.selector.secret', 'school.selector.secret.extra',
      'https://raqeem.ma/welcome/x', 'school.selector%2Esecret', 'school.selector.secret?x=1']) {
      expect(isAccountActivationLinkToken(token)).toBe(false);
    }
  });

  it('rejects extra browser-controlled identity fields', () => {
    expect(parseAccountActivationLinkPayload('inspect', { token: TOKEN, tenant: 'school' }))
      .toEqual({ ok: false, reason: 'shape' });
    expect(parseAccountActivationLinkPayload('complete', { token: TOKEN, password: 'x', password_confirmation: 'x' }))
      .toEqual({ ok: false, reason: 'shape' });
  });
});
