import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdmissionPrefill } from '@/types/admission';
import type { PersonSearchResult } from '@/types/student-360';
import { searchGuardiansGlobally } from './guardian-global-search';
import {
  applyAdmissionGuardianResolution,
  extractAdmissionGuardianLookupSnapshot,
  parseAdmissionGuardianResolution,
  resolveAdmissionGuardianBeforeRegistration,
  serializeAdmissionGuardianResolution,
} from './admission-guardian-pre-resolution';

vi.mock('./guardian-global-search', () => ({
  searchGuardiansGlobally: vi.fn(),
}));

const mockedSearch = vi.mocked(searchGuardiansGlobally);

function prefill(overrides: Partial<AdmissionPrefill> = {}): AdmissionPrefill {
  return {
    student: { first_name: 'Child', last_name: 'Test' },
    guardian: {
      name: 'Guardian Test',
      phone: '0612345678',
      relationship: 'father',
      cin: 'AB123456',
    },
    academic: {},
    admission: {},
    ...overrides,
  };
}

function candidate(params: {
  partnerId: number;
  guardianId?: number | null;
  phone?: string | null;
  identity?: string | null;
  matchBasis?: string | null;
}): PersonSearchResult {
  return {
    id: params.guardianId ?? params.partnerId,
    partner_id: params.partnerId,
    person_id: params.partnerId,
    guardian_id: params.guardianId ?? null,
    name: `Guardian ${params.partnerId}`,
    phone: params.phone ?? null,
    identity_document_number: params.identity ?? null,
    existing_roles: params.guardianId ? ['guardian'] : [],
    role_labels: [],
    has_user_account: false,
    can_link_as_guardian: true,
    match_basis: params.matchBasis as PersonSearchResult['match_basis'],
  };
}

describe('admission guardian pre-resolution', () => {
  beforeEach(() => {
    mockedSearch.mockReset();
  });

  it('extracts phone and identity from the admission guardian snapshot', () => {
    expect(extractAdmissionGuardianLookupSnapshot(prefill())).toEqual({
      name: 'Guardian Test',
      phone: '0612345678',
      identity: 'AB123456',
    });
  });

  it('uses an already-bound guardian without searching', async () => {
    const result = await resolveAdmissionGuardianBeforeRegistration({
      prefill: prefill({ guardian_id: 701, has_guardian_id: true }),
      activeSchoolId: 3,
    });

    expect(result.status).toBe('already_bound');
    expect(result.resolution).toEqual({ kind: 'guardian', id: 701 });
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it('prefers a unique exact identity match', async () => {
    mockedSearch.mockResolvedValueOnce([
      candidate({
        partnerId: 90,
        guardianId: 801,
        phone: '0699999999',
        identity: 'AB123456',
        matchBasis: 'identity_document',
      }),
    ]);

    const result = await resolveAdmissionGuardianBeforeRegistration({
      prefill: prefill(),
      activeSchoolId: 3,
    });

    expect(result.status).toBe('unique');
    expect(result.basis).toBe('identity');
    expect(result.resolution).toEqual({ kind: 'guardian', id: 801 });
    expect(mockedSearch).toHaveBeenCalledTimes(1);
  });

  it('matches an existing person by phone when no guardian profile exists', async () => {
    mockedSearch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        candidate({ partnerId: 6655, phone: '+212612345678' }),
      ]);

    const result = await resolveAdmissionGuardianBeforeRegistration({
      prefill: prefill(),
      activeSchoolId: 3,
    });

    expect(result.status).toBe('unique');
    expect(result.basis).toBe('phone');
    expect(result.resolution).toEqual({ kind: 'person', id: 6655 });
  });

  it('does not choose automatically when several exact phone matches exist', async () => {
    mockedSearch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        candidate({ partnerId: 10, guardianId: 110, phone: '0612345678' }),
        candidate({ partnerId: 20, guardianId: 120, phone: '+212612345678' }),
      ]);

    const result = await resolveAdmissionGuardianBeforeRegistration({
      prefill: prefill(),
      activeSchoolId: 3,
    });

    expect(result.status).toBe('ambiguous');
    expect(result.basis).toBe('phone');
    expect(result.resolution).toBeNull();
    expect(result.candidates).toHaveLength(2);
  });

  it('uses phone to disambiguate multiple identity search results', async () => {
    const first = candidate({
      partnerId: 10,
      guardianId: 110,
      phone: '0699999999',
      identity: 'AB123456',
      matchBasis: 'identity_document',
    });
    const second = candidate({
      partnerId: 20,
      guardianId: 120,
      phone: '0612345678',
      identity: 'AB123456',
      matchBasis: 'identity_document',
    });
    mockedSearch.mockResolvedValueOnce([first, second]).mockResolvedValueOnce([second]);

    const result = await resolveAdmissionGuardianBeforeRegistration({
      prefill: prefill(),
      activeSchoolId: 3,
    });

    expect(result.status).toBe('unique');
    expect(result.resolution).toEqual({ kind: 'guardian', id: 120 });
  });

  it('falls back to a new guardian only when no exact identity or phone match exists', async () => {
    mockedSearch.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await resolveAdmissionGuardianBeforeRegistration({
      prefill: prefill(),
      activeSchoolId: 3,
    });

    expect(result.status).toBe('none');
    expect(result.resolution).toEqual({ kind: 'new' });
  });

  it('applies guardian and person resolutions without changing admission data', () => {
    const source = prefill();
    const guardianResolved = applyAdmissionGuardianResolution(source, { kind: 'guardian', id: 55 });
    expect(guardianResolved.guardian_id).toBe(55);
    expect(guardianResolved.guardian_selection).toMatchObject({
      guardian_id: 55,
      has_bound_guardian: true,
      is_existing_guardian_selected: true,
      selection_required: false,
    });

    const personResolved = applyAdmissionGuardianResolution(source, { kind: 'person', id: 6655 });
    expect(personResolved.guardian).toMatchObject({ person_id: 6655 });
    expect(personResolved.guardian_selection).toMatchObject({
      guardian_id: null,
      is_existing_guardian_selected: true,
      selection_required: false,
    });
    expect(personResolved.student).toEqual(source.student);
  });

  it('round-trips safe resolution query values', () => {
    expect(parseAdmissionGuardianResolution('guardian:12')).toEqual({ kind: 'guardian', id: 12 });
    expect(parseAdmissionGuardianResolution('person:34')).toEqual({ kind: 'person', id: 34 });
    expect(parseAdmissionGuardianResolution('new')).toEqual({ kind: 'new' });
    expect(parseAdmissionGuardianResolution('guardian:-1')).toBeNull();
    expect(serializeAdmissionGuardianResolution({ kind: 'person', id: 34 })).toBe('person:34');
  });
});
