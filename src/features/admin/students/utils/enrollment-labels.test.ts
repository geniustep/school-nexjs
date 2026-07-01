import { describe, expect, it } from 'vitest';
import { registrationTypeLabel } from './enrollment-labels';

const t = (key: string) =>
  key.startsWith('admin.student360.registrationTypes.')
    ? key.replace('admin.student360.registrationTypes.', '')
    : key;

describe('registrationTypeLabel', () => {
  it('uses i18n for known values even when API label is English', () => {
    expect(registrationTypeLabel(t, 'new')).toBe('new');
    expect(
      registrationTypeLabel(t, 'new', [{ value: 'new', label: 'New student' }]),
    ).toBe('new');
    expect(
      registrationTypeLabel(t, 'transfer', [{ value: 'transfer', label: 'Transfer' }]),
    ).toBe('transfer');
  });
});
