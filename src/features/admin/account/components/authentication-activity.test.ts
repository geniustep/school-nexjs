import { describe, expect, it } from 'vitest';
import { authenticationActivityText } from './authentication-activity';

describe('authentication activity list presentation', () => {
  it('does not interpret a missing contract as no account', () => {
    expect(authenticationActivityText(undefined, 'ar')).toEqual({ state: 'غير متوفر', last: '—' });
  });
  it('distinguishes accounts without authentication from people without accounts', () => {
    expect(authenticationActivityText({ activity_state: 'no_account', last_authenticated_at: null, activity_confidence: null }, 'fr').state).toBe('Sans compte');
    expect(authenticationActivityText({ activity_state: 'never_authenticated', last_authenticated_at: null, activity_confidence: null }, 'ar').state).toBe('لم يسجل الدخول بعد');
  });
  it('shows a real sign-in timestamp only with authentication confidence', () => {
    const value = { activity_state: 'authenticated' as const, last_authenticated_at: '2026-10-11 14:30:00', activity_confidence: 'authentication_only' as const };
    expect(authenticationActivityText(value, 'fr').last).not.toBe('—');
    expect(authenticationActivityText({ ...value, activity_confidence: null }, 'fr').last).toBe('—');
    expect(authenticationActivityText({ ...value, last_authenticated_at: 'not-a-date' }, 'fr').last).toBe('—');
  });
});
