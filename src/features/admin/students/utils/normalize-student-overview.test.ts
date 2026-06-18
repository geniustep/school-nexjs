import { describe, expect, it } from 'vitest';
import {
  consentHeaderBadgeKind,
  normalizeConsentFlag,
} from './student-consent-flags';
import { normalizeStudentOverviewResponse } from './normalize-student-overview';

describe('student-consent-flags', () => {
  it('does not treat null state as pending or blocked', () => {
    const flag = normalizeConsentFlag({ state: null, allowed: false, has_attachment: false });
    expect(flag).toEqual({ state: null, allowed: false, hasAttachment: false });
    expect(consentHeaderBadgeKind(flag)).toBeNull();
  });

  it('treats denied as blocked', () => {
    const flag = normalizeConsentFlag({ state: 'denied', allowed: false, has_attachment: false });
    expect(consentHeaderBadgeKind(flag)).toBe('blocked');
  });

  it('treats pending as pending', () => {
    const flag = normalizeConsentFlag({ state: 'pending', allowed: false, has_attachment: false });
    expect(consentHeaderBadgeKind(flag)).toBe('pending');
  });

  it('treats granted as no header badge', () => {
    const flag = normalizeConsentFlag({ state: 'granted', allowed: true, has_attachment: true });
    expect(consentHeaderBadgeKind(flag)).toBeNull();
  });

  it('normalizes legacy string values', () => {
    expect(normalizeConsentFlag('granted')).toEqual({
      state: 'granted',
      allowed: true,
      hasAttachment: false,
    });
  });
});

describe('normalizeStudentOverviewResponse consents', () => {
  it('reads important_flags from API shape', () => {
    const result = normalizeStudentOverviewResponse({
      consents_summary: {
        can_view: true,
        important_flags: {
          photo_publish: { state: null, allowed: false, has_attachment: false },
          trip_participation: { state: 'pending', allowed: false, has_attachment: false },
        },
      },
    });

    expect(result?.consents_summary?.important_flags?.photo_publish).toEqual({
      state: null,
      allowed: false,
      hasAttachment: false,
    });
    expect(consentHeaderBadgeKind(result?.consents_summary?.important_flags?.photo_publish)).toBeNull();
    expect(consentHeaderBadgeKind(result?.consents_summary?.important_flags?.trip_participation)).toBe(
      'pending',
    );
  });

  it('supports legacy flat consent strings', () => {
    const result = normalizeStudentOverviewResponse({
      consents_summary: {
        can_view: true,
        photo_publish: 'granted',
        trip_participation: 'denied',
      },
    });

    expect(result?.consents_summary?.photo_publish).toBe('granted');
    expect(result?.consents_summary?.trip_participation).toBe('denied');
    expect(consentHeaderBadgeKind(result?.consents_summary?.important_flags?.photo_publish)).toBeNull();
    expect(consentHeaderBadgeKind(result?.consents_summary?.important_flags?.trip_participation)).toBe(
      'blocked',
    );
  });

  it('hides consent details when can_view is false', () => {
    const result = normalizeStudentOverviewResponse({
      consents_summary: {
        can_view: false,
        photo_publish: 'granted',
      },
    });
    expect(result?.consents_summary?.can_view).toBe(false);
    expect(result?.consents_summary?.photo_publish).toBe('granted');
  });

  it('tolerates missing consents_summary', () => {
    expect(normalizeStudentOverviewResponse({ available: true })?.consents_summary).toBeNull();
  });
});
