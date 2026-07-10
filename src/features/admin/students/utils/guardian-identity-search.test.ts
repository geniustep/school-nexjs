import { describe, expect, it } from 'vitest';
import { normalizePersonSearchResult } from '@/features/admin/students/utils/normalize-person-search';
import { resolveMaskedIdentityDocument } from '@/features/admin/parents/utils/identity-document';
import { studentSpotlightMatchedOnLabelKey } from '@/features/admin/students/utils/student-spotlight-utils';
import { mapGuardianApiError } from '@/features/admin/students/utils/guardian-api-errors';

const t = (key: string) => key;

describe('guardian search identity match', () => {
  it('normalizes match_basis=identity_document and masked only', () => {
    const person = normalizePersonSearchResult({
      partner_id: 44,
      id: 44,
      name: 'Guardian',
      match_basis: 'identity_document',
      national_id_masked: 'AB****12',
      identity_document_number: 'RAW-FULL-NUMBER',
      can_link_as_guardian: true,
      existing_roles: ['guardian'],
      role_labels: ['Guardian'],
      has_user_account: false,
    });
    expect(person?.match_basis).toBe('identity_document');
    expect(resolveMaskedIdentityDocument(person)).toBe('AB****12');
    expect(resolveMaskedIdentityDocument(person)).not.toBe('RAW-FULL-NUMBER');
  });

  it('maps guardian_identity_candidate_exists with candidate reuse', () => {
    const mapped = mapGuardianApiError(
      {
        code: 'guardian_identity_candidate_exists',
        message: 'exists',
        details: {
          candidate: {
            partner_id: 9,
            id: 9,
            name: 'Reuse Me',
            national_id_masked: 'ZZ****01',
            identity_document_number: 'SECRET',
          },
        },
      },
      t,
    );
    expect(mapped.duplicateField).toBe('national_id');
    expect(mapped.message).toBe('admin.identityDocument.duplicateExists');
    expect(mapped.matches?.[0]?.name).toBe('Reuse Me');
    expect(resolveMaskedIdentityDocument(mapped.matches?.[0])).toBe('ZZ****01');
  });
});

describe('student search guardian_identity label', () => {
  it('maps matched_on=guardian_identity', () => {
    expect(studentSpotlightMatchedOnLabelKey('guardian_identity')).toBe(
      'admin.spotlight.matchedOn.guardian_identity',
    );
  });
});

describe('family admission / search rendering privacy', () => {
  it('search result rendering helpers never expose raw document number', () => {
    const person = normalizePersonSearchResult({
      partner_id: 1,
      id: 1,
      name: 'A',
      match_basis: 'identity_document',
      national_id_masked: 'M****9',
      identity_document_number: 'RAW123',
      national_id: 'RAW123',
      can_link_as_guardian: true,
      existing_roles: [],
      role_labels: [],
      has_user_account: false,
    });
    const masked = resolveMaskedIdentityDocument(person);
    expect(masked).toBe('M****9');
    expect(JSON.stringify({ masked, match: person?.match_basis })).not.toContain('RAW123');
  });
});
