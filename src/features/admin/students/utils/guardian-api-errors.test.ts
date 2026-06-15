import { describe, expect, it } from 'vitest';
import { mapGuardianApiError } from './guardian-api-errors';

const t = (key: string) => key;

describe('mapGuardianApiError', () => {
  it('maps guardian_duplicate with matches and phone field', () => {
    const result = mapGuardianApiError(
      {
        code: 'guardian_duplicate',
        message: 'duplicate phone',
        details: { matches: [{ id: 1, name: 'A', mobile: '0612345678' }], duplicate_field: 'phone' },
      },
      t,
    );
    expect(result.matches).toHaveLength(1);
    expect(result.duplicateField).toBe('phone');
    expect(result.message).toBe('admin.student360.guardianDuplicatePhone');
  });

  it('maps guardian_duplicate email field', () => {
    const result = mapGuardianApiError(
      {
        code: 'guardian_duplicate',
        message: 'duplicate email',
        details: { duplicate_field: 'email' },
      },
      t,
    );
    expect(result.duplicateField).toBe('email');
    expect(result.message).toBe('admin.student360.guardianDuplicateEmail');
  });

  it('maps primary_guardian_conflict', () => {
    const result = mapGuardianApiError({ code: 'primary_guardian_conflict', message: '' }, t);
    expect(result.field).toBe('is_primary_contact');
  });
});
