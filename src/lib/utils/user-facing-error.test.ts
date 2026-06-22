import { describe, expect, it } from 'vitest';
import {
  containsInternalTechLeak,
  isUnsafeUserFacingErrorMessage,
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
});
