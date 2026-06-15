import { describe, expect, it } from 'vitest';
import { registrationTypeLabel } from './enrollment-labels';

const t = (key: string) =>
  key.startsWith('admin.student360.registrationTypes.')
    ? key.replace('admin.student360.registrationTypes.', '')
    : key;

describe('registrationTypeLabel', () => {
  it('uses i18n fallback for known values', () => {
    expect(registrationTypeLabel(t, 'new')).toBe('new');
    expect(registrationTypeLabel(t, 'transfer')).toBe('transfer');
  });

  it('prefers options label when provided', () => {
    expect(
      registrationTypeLabel(t, 'new', [{ value: 'new', label: 'New student' }]),
    ).toBe('New student');
  });
});
