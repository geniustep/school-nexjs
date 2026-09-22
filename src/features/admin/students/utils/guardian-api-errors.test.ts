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

  it('maps unique staff identity conflict to generic existing-person recovery', () => {
    const result = mapGuardianApiError(
      {
        code: 'guardian_identity_candidate_exists',
        message: 'A matching person already exists.',
        details: {
          match_basis: 'unique_staff_name_in_school',
          candidate_partner_id: 49,
          candidate_display_name: 'Existing Staff',
          can_reuse: true,
        },
      },
      t,
    );
    expect(result.duplicateField).toBe('unknown');
    expect(result.message).toBe('admin.student360.guardianDuplicate');
    expect(result.matches).toBeUndefined();
  });

  it('maps ambiguous staff identity conflict to search-existing recovery', () => {
    const result = mapGuardianApiError(
      {
        code: 'guardian_identity_ambiguous',
        message: 'Multiple existing staff identities match.',
        details: {
          match_basis: 'staff_name_in_school',
          candidate_count: 2,
          recovery_action: 'search_existing_person',
        },
      },
      t,
    );
    expect(result.duplicateField).toBe('unknown');
    expect(result.message).toBe('admin.student360.guardianDuplicate');
  });

  it('maps primary_guardian_conflict', () => {
    const result = mapGuardianApiError({ code: 'primary_guardian_conflict', message: '' }, t);
    expect(result.field).toBe('is_primary_contact');
  });

  it('maps guardian_identity_candidate_exists', () => {
    const result = mapGuardianApiError(
      {
        code: 'guardian_identity_candidate_exists',
        message: '',
        details: { candidate: { partner_id: 2, id: 2, name: 'X', national_id_masked: 'A*1' } },
      },
      t,
    );
    expect(result.duplicateField).toBe('national_id');
    expect(result.message).toBe('admin.identityDocument.duplicateExists');
    expect(result.matches?.[0]?.name).toBe('X');
  });
});
