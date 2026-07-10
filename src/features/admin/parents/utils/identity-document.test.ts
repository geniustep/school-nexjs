import { describe, expect, it } from 'vitest';
import {
  buildIdentityDocumentCreatePayload,
  buildIdentityDocumentUpdatePayload,
  emptyIdentityDocumentFormValues,
  hasConflictingIdentityPayload,
  identityDocumentFromEntity,
  resolveFullIdentityDocumentNumber,
  resolveIdentityDocumentCountry,
  resolveMaskedIdentityDocument,
  validateIdentityDocumentForm,
} from './identity-document';
import {
  extractIdentityConflictCandidates,
  identityConflictCandidateLabel,
  mapParentApiError,
} from './map-parent-api-error';
import { normalizeParentProfile } from './normalize-parent-profile';

const t = (key: string) => key;

describe('identity document form mapping', () => {
  it('maps national_id with default MA country', () => {
    const payload = buildIdentityDocumentCreatePayload({
      type: 'national_id',
      number: 'BE123456',
      country: '',
      clear: false,
    });
    expect(payload).toEqual({
      identity_document_type: 'national_id',
      identity_document_number: 'BE123456',
      identity_document_country: 'MA',
    });
    expect(payload).not.toHaveProperty('national_id');
  });

  it('maps passport with required country', () => {
    const payload = buildIdentityDocumentCreatePayload({
      type: 'passport',
      number: 'P1234567',
      country: 'fr',
      clear: false,
    });
    expect(payload).toEqual({
      identity_document_type: 'passport',
      identity_document_number: 'P1234567',
      identity_document_country: 'FR',
    });
  });

  it('maps residence_card with country', () => {
    const payload = buildIdentityDocumentCreatePayload({
      type: 'residence_card',
      number: 'RC9988',
      country: 'MA',
      clear: false,
    });
    expect(payload).toEqual({
      identity_document_type: 'residence_card',
      identity_document_number: 'RC9988',
      identity_document_country: 'MA',
    });
  });

  it('allows no identity document (valid empty create)', () => {
    expect(buildIdentityDocumentCreatePayload(emptyIdentityDocumentFormValues())).toBeNull();
    expect(validateIdentityDocumentForm(emptyIdentityDocumentFormValues(), t)).toEqual({});
  });

  it('handles country defaults and requirements', () => {
    expect(resolveIdentityDocumentCountry('national_id', '')).toBe('MA');
    expect(resolveIdentityDocumentCountry('passport', 'es')).toBe('ES');
    expect(resolveIdentityDocumentCountry('other', '')).toBeUndefined();
    expect(
      validateIdentityDocumentForm(
        { type: 'passport', number: 'X1', country: '', clear: false },
        t,
      ).country,
    ).toBe('admin.identityDocument.errors.countryRequired');
  });

  it('does not produce conflicting national_id + identity_document payload', () => {
    const payload = buildIdentityDocumentCreatePayload({
      type: 'national_id',
      number: 'AB11',
      country: 'MA',
      clear: false,
    })!;
    expect(hasConflictingIdentityPayload({ ...payload })).toBe(false);
    expect(
      hasConflictingIdentityPayload({
        ...payload,
        national_id: 'AB11',
      }),
    ).toBe(true);
  });

  it('edit: intentional clear sends nulls; emptying without clear omits', () => {
    const initial = identityDocumentFromEntity({
      identity_document_type: 'passport',
      identity_document_number: 'P1',
      identity_document_country: 'FR',
    });
    expect(
      buildIdentityDocumentUpdatePayload(
        { type: '', number: '', country: '', clear: true },
        initial,
      ),
    ).toEqual({
      identity_document_type: null,
      identity_document_number: null,
      identity_document_country: null,
    });
    expect(
      buildIdentityDocumentUpdatePayload(
        { type: '', number: '', country: '', clear: false },
        initial,
      ),
    ).toBeNull();
  });
});

describe('identity document privacy helpers', () => {
  it('masked resolver never falls back to full number', () => {
    expect(
      resolveMaskedIdentityDocument({
        identity_document_number: 'FULL-SECRET',
        national_id: 'FULL-SECRET',
      }),
    ).toBeNull();
    expect(
      resolveMaskedIdentityDocument({
        national_id_masked: 'BE****56',
        identity_document_number: 'FULL-SECRET',
      }),
    ).toBe('BE****56');
  });

  it('full number is available for authorized detail', () => {
    expect(
      resolveFullIdentityDocumentNumber({
        identity_document_number: 'BE123456',
        national_id_masked: 'BE****56',
      }),
    ).toBe('BE123456');
  });
});

describe('parent detail identity rendering data', () => {
  it('normalizes identity fields for authorized parent detail', () => {
    const parent = normalizeParentProfile({
      id: 10,
      name: 'Parent',
      identity_document_type: 'passport',
      identity_document_number: 'P998877',
      identity_document_country: 'FR',
      national_id_masked: 'P****77',
    });
    expect(parent?.identity_document_type).toBe('passport');
    expect(parent?.identity_document_number).toBe('P998877');
    expect(parent?.identity_document_country).toBe('FR');
    expect(parent?.national_id_masked).toBe('P****77');
  });
});

describe('duplicate identity error mapping', () => {
  it('maps guardian_identity_candidate_exists without exposing full number', () => {
    const mapped = mapParentApiError(
      {
        code: 'guardian_identity_candidate_exists',
        message: 'duplicate',
        details: {
          candidate: {
            partner_id: 5,
            id: 5,
            name: 'Existing',
            national_id_masked: 'XX****99',
            identity_document_number: 'SHOULD-NOT-USE',
          },
        },
      },
      t,
    );
    expect(mapped.identityConflict).toBe(true);
    expect(mapped.message).toBe('admin.identityDocument.duplicateExists');
    expect(mapped.message).not.toContain('SHOULD-NOT-USE');
    const candidates = extractIdentityConflictCandidates({
      candidate: {
        partner_id: 5,
        id: 5,
        name: 'Existing',
        national_id_masked: 'XX****99',
        identity_document_number: 'SHOULD-NOT-USE',
      },
    });
    const label = identityConflictCandidateLabel(candidates[0]!);
    expect(label.maskedIdentity).toBe('XX****99');
    expect(label.maskedIdentity).not.toBe('SHOULD-NOT-USE');
  });
});
