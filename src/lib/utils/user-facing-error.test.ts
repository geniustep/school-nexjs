import { describe, expect, it } from 'vitest';
import {
  containsInternalTechLeak,
  isEnglishInfrastructureErrorMessage,
  isUnsafeUserFacingErrorMessage,
  resolveKnownApiErrorMessageKey,
  sanitizeClientApiErrorMessage,
  sanitizeUserFacingErrorMessage,
} from './user-facing-error';

describe('user-facing-error', () => {
  it('detects Odoo and technical field leaks', () => {
    expect(containsInternalTechLeak('Odoo')).toBe(true);
    expect(containsInternalTechLeak('class id')).toBe(true);
    expect(containsInternalTechLeak('subject_id required')).toBe(true);
    expect(containsInternalTechLeak('تعذر حفظ البيانات')).toBe(false);
  });

  it('replaces unsafe messages with fallback', () => {
    const fallback = 'تعذر تحميل البيانات. يرجى إعادة المحاولة.';
    expect(sanitizeUserFacingErrorMessage('Odoo', fallback)).toBe(fallback);
    expect(sanitizeUserFacingErrorMessage('class id', fallback)).toBe(fallback);
    expect(sanitizeUserFacingErrorMessage('رسالة واضحة', fallback)).toBe('رسالة واضحة');
  });

  it('clears unsafe client API messages', () => {
    expect(sanitizeClientApiErrorMessage('Odoo')).toBe('');
    expect(sanitizeClientApiErrorMessage('endpoint failed')).toBe('');
    expect(sanitizeClientApiErrorMessage('القسم مطلوب')).toBe('القسم مطلوب');
  });

  it('flags html and traceback as unsafe', () => {
    expect(isUnsafeUserFacingErrorMessage('<p>Odoo</p>')).toBe(true);
    expect(isUnsafeUserFacingErrorMessage('Traceback (most recent call last)')).toBe(true);
  });

  it('flags English bad-gateway / infra messages as unsafe', () => {
    expect(
      isEnglishInfrastructureErrorMessage(
        'The web server reported a bad gateway error.',
      ),
    ).toBe(true);
    expect(
      isUnsafeUserFacingErrorMessage('The web server reported a bad gateway error.'),
    ).toBe(true);
    expect(
      sanitizeUserFacingErrorMessage(
        'The web server reported a bad gateway error.',
        'تعذّر الوصول إلى الخادم مؤقتًا.',
      ),
    ).toBe('تعذّر الوصول إلى الخادم مؤقتًا.');
  });

  it('maps known English infra messages to i18n keys', () => {
    expect(
      resolveKnownApiErrorMessageKey('The web server reported a bad gateway error.'),
    ).toBe('errors.badGateway');
    expect(
      resolveKnownApiErrorMessageKey(
        'Could not reach the server. Please check your connection.',
      ),
    ).toBe('errors.network');
  });
});
