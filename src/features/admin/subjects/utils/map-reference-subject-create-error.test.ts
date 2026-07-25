import { describe, expect, it } from 'vitest';
import { mapReferenceSubjectCreateError } from './map-reference-subject-create-error';

const t = (key: string) => key;

describe('mapReferenceSubjectCreateError', () => {
  it('maps known codes to messages and fields', () => {
    expect(
      mapReferenceSubjectCreateError({ code: 'reference_subject_manage_forbidden', message: '' }, t),
    ).toEqual({
      code: 'reference_subject_manage_forbidden',
      message: 'admin.referenceSubjects.errors.manageForbidden',
      field: 'form',
    });
    expect(
      mapReferenceSubjectCreateError({ code: 'reference_subject_code_conflict', message: '' }, t),
    ).toMatchObject({ field: 'code' });
    expect(
      mapReferenceSubjectCreateError({ code: 'reference_subject_cycle_not_found', message: '' }, t),
    ).toMatchObject({ field: 'cycle' });
    expect(
      mapReferenceSubjectCreateError({ code: 'reference_subject_level_not_found', message: '' }, t),
    ).toMatchObject({ field: 'levels' });
    expect(
      mapReferenceSubjectCreateError(
        { code: 'reference_subject_cycle_level_mismatch', message: '' },
        t,
      ),
    ).toMatchObject({ field: 'levels' });
    expect(
      mapReferenceSubjectCreateError({ code: 'invalid_payload', message: '' }, t),
    ).toMatchObject({ field: 'form' });
  });
});
