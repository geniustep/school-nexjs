import { describe, expect, it } from 'vitest';
import { emptyIdentityDocumentFormValues } from '@/features/admin/parents/utils/identity-document';
import { resolveMaskedIdentityDocument } from '@/features/admin/parents/utils/identity-document';
import { mapGuardianApiError } from './guardian-api-errors';
import {
  buildGuardianQuickCreatePayload,
} from './guardian-quick-create-payload';
import {
  buildCreateFamilyBatchPayload,
} from '@/features/admin/admissions/utils/family-admission-payload';
import { emptyFamilyAdmissionFormState } from '@/features/admin/admissions/utils/family-admission-form-state';

const t = (key: string) => key;

const basePerson = {
  firstName: 'Ahmed',
  lastName: 'Alaoui',
  phone: '0612345678',
  email: 'a@example.test',
};

describe('guardian quick-create identity document mapping', () => {
  it('maps national_id with default MA country', () => {
    const payload = buildGuardianQuickCreatePayload({
      ...basePerson,
      identityDocument: {
        type: 'national_id',
        number: 'BE123456',
        country: '',
        clear: false,
      },
    });
    expect(payload.identity_document_type).toBe('national_id');
    expect(payload.identity_document_number).toBe('BE123456');
    expect(payload.identity_document_country).toBe('MA');
    expect(payload).not.toHaveProperty('national_id');
  });

  it('maps passport without assuming MA', () => {
    const payload = buildGuardianQuickCreatePayload({
      ...basePerson,
      identityDocument: {
        type: 'passport',
        number: 'P998877',
        country: 'FR',
        clear: false,
      },
    });
    expect(payload.identity_document_type).toBe('passport');
    expect(payload.identity_document_number).toBe('P998877');
    expect(payload.identity_document_country).toBe('FR');
    expect(payload.identity_document_country).not.toBe('MA');
  });

  it('maps residence_card with country', () => {
    const payload = buildGuardianQuickCreatePayload({
      ...basePerson,
      identityDocument: {
        type: 'residence_card',
        number: 'RC55',
        country: 'MA',
        clear: false,
      },
    });
    expect(payload.identity_document_type).toBe('residence_card');
    expect(payload.identity_document_number).toBe('RC55');
    expect(payload.identity_document_country).toBe('MA');
  });

  it('allows quick create without identity document', () => {
    const payload = buildGuardianQuickCreatePayload({
      ...basePerson,
      identityDocument: emptyIdentityDocumentFormValues(),
    });
    expect(payload.name).toBe('Ahmed Alaoui');
    expect(Object.keys(payload)).not.toContain('identity_document_type');
    expect(Object.keys(payload)).not.toContain('identity_document_number');
    expect(Object.keys(payload)).not.toContain('identity_document_country');
    expect(Object.keys(payload)).not.toContain('national_id');
    expect(Object.keys(payload)).not.toContain('national_id_masked');
  });

  it('handles country defaults and passport country requirement via payload builder', () => {
    const national = buildGuardianQuickCreatePayload({
      ...basePerson,
      identityDocument: {
        type: 'national_id',
        number: 'X1',
        country: 'ignored',
        clear: false,
      },
    });
    expect(national.identity_document_country).toBe('MA');

    const passportNoCountry = buildGuardianQuickCreatePayload({
      ...basePerson,
      identityDocument: {
        type: 'passport',
        number: 'P1',
        country: '',
        clear: false,
      },
    });
    expect(passportNoCountry.identity_document_type).toBe('passport');
    expect(passportNoCountry.identity_document_country).toBeUndefined();
  });
});

describe('quick-create identity conflict privacy', () => {
  it('maps guardian_identity_candidate_exists with masked candidate only', () => {
    const mapped = mapGuardianApiError(
      {
        code: 'guardian_identity_candidate_exists',
        message: 'exists',
        details: {
          candidate: {
            partner_id: 9,
            id: 9,
            name: 'Existing Guardian',
            national_id_masked: 'BE****56',
            identity_document_number: 'RAW-FULL-SECRET',
            national_id: 'RAW-FULL-SECRET',
          },
        },
      },
      t,
    );
    expect(mapped.message).toBe('admin.identityDocument.duplicateExists');
    expect(mapped.duplicateField).toBe('national_id');
    expect(mapped.matches?.[0]?.name).toBe('Existing Guardian');
    const masked = resolveMaskedIdentityDocument(mapped.matches?.[0]);
    expect(masked).toBe('BE****56');
    expect(masked).not.toContain('RAW-FULL-SECRET');
    // Conflict UI must render masked only (GuardianDuplicateAlert uses resolveMaskedIdentityDocument).
    expect(mapped.message).not.toContain('RAW-FULL-SECRET');
  });
});

describe('family batch isolation from identity document', () => {
  it('does not leak flat identity fields into shared_contact', () => {
    const form = emptyFamilyAdmissionFormState('2026-07-10');
    form.family = {
      ...form.family,
      academic_year_id: 1,
    };
    form.guardians = [
      {
        ...form.guardians[0],
        guardianId: 42,
        name: 'Parent',
        phone: '0612345678',
        relationship: 'father',
      },
    ];
    // Mis-attached flat keys on family meta must not appear on shared_contact.
    Object.assign(form.family, {
      identity_document_type: 'passport',
      identity_document_number: 'SHOULD-NOT-APPEAR',
      national_id: 'SHOULD-NOT-APPEAR',
    });

    const payload = buildCreateFamilyBatchPayload(form, 3, 'fam-key', [
      { id: 1, name: 'CP', cycle: 'primary', requires_stream: false },
    ]);
    const sharedFlat = JSON.stringify(payload.shared_contact);
    expect(sharedFlat).not.toContain('SHOULD-NOT-APPEAR');
    expect(sharedFlat).not.toContain('identity_document');
    expect(sharedFlat).not.toContain('national_id');
    expect(payload.shared_contact.guardian_id).toBe(42);
    expect(Object.keys(payload.shared_contact)).not.toContain('identity_document_type');
    expect(Object.keys(payload.shared_contact)).not.toContain('identity_document_number');
    expect(Object.keys(payload.shared_contact)).not.toContain('identity_document_country');
    expect(Object.keys(payload.shared_contact)).not.toContain('national_id');
    expect(Object.keys(payload.shared_contact)).not.toContain('national_id_masked');
  });
});
