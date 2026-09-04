import { describe, expect, it } from 'vitest';
import {
  isAllSchoolsEligiblePath,
  isAllSchoolsReadMode,
  setAllSchoolsScope,
} from './all-schools-read-mode';

describe('all-schools read mode', () => {
  it.each(['/admin/dashboard', '/admin/students', '/admin/classes', '/admin/parents'])(
    'allows %s',
    (pathname) => expect(isAllSchoolsEligiblePath(pathname)).toBe(true),
  );

  it.each(['/admin/finance', '/admin/teachers', '/admin/students/1', '/admin/classes/1'])(
    'does not leak to %s',
    (pathname) => expect(isAllSchoolsEligiblePath(pathname)).toBe(false),
  );

  it('recognizes scope=all-schools only on eligible pages', () => {
    const params = new URLSearchParams('scope=all-schools');
    expect(isAllSchoolsReadMode('/admin/students', params)).toBe(true);
    expect(isAllSchoolsReadMode('/admin/teachers', params)).toBe(false);
  });

  it('preserves unrelated query params when entering and leaving mode', () => {
    const initial = new URLSearchParams('search=ali&page=2');
    const enabled = setAllSchoolsScope(initial, true);
    expect(enabled.get('scope')).toBe('all-schools');
    expect(enabled.get('search')).toBe('ali');
    expect(enabled.get('page')).toBe('2');

    const disabled = setAllSchoolsScope(enabled, false);
    expect(disabled.get('scope')).toBeNull();
    expect(disabled.get('search')).toBe('ali');
    expect(disabled.get('page')).toBe('2');
  });
});
