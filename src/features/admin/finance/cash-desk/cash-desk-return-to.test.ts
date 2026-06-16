import { describe, expect, it } from 'vitest';
import { appendReturnTo, isSafeInternalReturnPath } from '@/lib/utils/safe-return-url';

describe('cash desk returnTo safety', () => {
  it('allows internal finance and cash desk paths', () => {
    expect(isSafeInternalReturnPath('/admin/finance/collections/new')).toBe(true);
    expect(isSafeInternalReturnPath('/admin/finance/cash-desk')).toBe(true);
  });

  it('blocks external redirects', () => {
    expect(isSafeInternalReturnPath('https://evil.test/x')).toBe(false);
    expect(isSafeInternalReturnPath('//evil.test/x')).toBe(false);
  });

  it('appends returnTo for collection handoff', () => {
    const href = appendReturnTo(
      '/admin/finance/cash-desk',
      '/admin/finance/collections/new?student_id=1',
    );
    expect(href).toContain('returnTo=');
    expect(decodeURIComponent(href)).toContain('/admin/finance/collections/new?student_id=1');
  });
});
