import { describe, expect, it } from 'vitest';
import { mapGuardianApiError } from './guardian-api-errors';

const t = (key: string) => key;

describe('mapGuardianApiError', () => {
  it('maps guardian_duplicate with matches', () => {
    const result = mapGuardianApiError(
      {
        code: 'guardian_duplicate',
        message: 'dup',
        details: { matches: [{ id: 1, name: 'A' }] },
      },
      t,
    );
    expect(result.matches).toHaveLength(1);
    expect(result.message).toBe('admin.student360.guardianDuplicate');
  });

  it('maps primary_guardian_conflict', () => {
    const result = mapGuardianApiError({ code: 'primary_guardian_conflict', message: '' }, t);
    expect(result.field).toBe('is_primary_contact');
  });
});
