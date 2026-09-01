import type { AdmissionPrefill } from '@/types/admission';
import type { PersonSearchResult } from '@/types/student-360';
import { extractAdmissionGuardianPrefillText } from '@/features/admin/admissions/utils/admission-prefill-mapper';
import { searchGuardiansGlobally } from './guardian-global-search';
import { normalizeMoroccanPhone } from './normalize-moroccan-phone';

export type AdmissionGuardianResolution =
  | { kind: 'new' }
  | { kind: 'guardian'; id: number }
  | { kind: 'person'; id: number };

export type AdmissionGuardianMatchBasis = 'identity' | 'phone' | null;

export interface AdmissionGuardianResolutionResult {
  status: 'already_bound' | 'unique' | 'ambiguous' | 'none';
  basis: AdmissionGuardianMatchBasis;
  candidates: PersonSearchResult[];
  resolution: AdmissionGuardianResolution | null;
}

export interface AdmissionGuardianLookupSnapshot {
  name: string;
  phone: string;
  identity: string;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  if (value == null || value === false) return '';
  return String(value).trim();
}

function positiveId(value: unknown): number | null {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function normalizeIdentity(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function phoneKey(value: string | null | undefined): string {
  const raw = value?.trim() ?? '';
  if (!raw) return '';
  const normalized = normalizeMoroccanPhone(raw);
  if (normalized.local) return normalized.local;
  return raw.replace(/\D/g, '');
}

function candidateResolution(candidate: PersonSearchResult): AdmissionGuardianResolution {
  const guardianId = positiveId(candidate.guardian_id);
  if (guardianId) return { kind: 'guardian', id: guardianId };
  return { kind: 'person', id: candidate.person_id ?? candidate.partner_id };
}

function dedupeCandidates(items: PersonSearchResult[]): PersonSearchResult[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.partner_id)) return false;
    seen.add(item.partner_id);
    return item.archived !== true && item.can_link_as_guardian !== false;
  });
}

export function extractAdmissionGuardianLookupSnapshot(
  prefill: AdmissionPrefill,
): AdmissionGuardianLookupSnapshot {
  const guardian = record(prefill.guardian);
  const snapshot = extractAdmissionGuardianPrefillText(prefill);
  return {
    name: snapshot.name,
    phone: snapshot.phone,
    identity:
      text(guardian.identity_document_number) ||
      text(guardian.identity) ||
      text(guardian.cin) ||
      text(guardian.national_id),
  };
}

export function parseAdmissionGuardianResolution(
  value: string | null,
): AdmissionGuardianResolution | null {
  if (!value) return null;
  if (value === 'new') return { kind: 'new' };
  const match = /^(guardian|person):(\d+)$/.exec(value);
  if (!match) return null;
  const id = positiveId(match[2]);
  if (!id) return null;
  return { kind: match[1] as 'guardian' | 'person', id };
}

export function serializeAdmissionGuardianResolution(
  resolution: AdmissionGuardianResolution,
): string {
  if (resolution.kind === 'new') return 'new';
  return `${resolution.kind}:${resolution.id}`;
}

export function applyAdmissionGuardianResolution(
  prefill: AdmissionPrefill,
  resolution: AdmissionGuardianResolution | null,
): AdmissionPrefill {
  if (!resolution || resolution.kind === 'new') return prefill;

  const guardian = { ...record(prefill.guardian) };
  const selection = { ...(prefill.guardian_selection ?? {}) };

  if (resolution.kind === 'guardian') {
    guardian.guardian_id = resolution.id;
    delete guardian.person_id;
    return {
      ...prefill,
      guardian,
      guardian_id: resolution.id,
      has_guardian_id: true,
      is_existing_guardian_selected: true,
      selection_required: false,
      requires_selection: false,
      guardian_selection: {
        ...selection,
        guardian_id: resolution.id,
        has_bound_guardian: true,
        is_existing_guardian_selected: true,
        selection_required: false,
        requires_selection: false,
        prefill_source: 'pre_registration_match',
      },
    };
  }

  guardian.person_id = resolution.id;
  delete guardian.guardian_id;
  return {
    ...prefill,
    guardian,
    guardian_id: null,
    has_guardian_id: false,
    is_existing_guardian_selected: true,
    selection_required: false,
    requires_selection: false,
    guardian_selection: {
      ...selection,
      guardian_id: null,
      has_bound_guardian: false,
      is_existing_guardian_selected: true,
      selection_required: false,
      requires_selection: false,
      prefill_source: 'pre_registration_person_match',
    },
  };
}

function exactIdentityMatches(
  identity: string,
  results: PersonSearchResult[],
): PersonSearchResult[] {
  const expected = normalizeIdentity(identity);
  if (!expected) return [];
  return dedupeCandidates(results).filter((candidate) => {
    const candidateIdentity = normalizeIdentity(
      candidate.identity_document_number ?? candidate.national_id ?? '',
    );
    if (candidateIdentity && candidateIdentity === expected) return true;
    return candidate.match_basis === 'identity_document';
  });
}

function exactPhoneMatches(phone: string, results: PersonSearchResult[]): PersonSearchResult[] {
  const expected = phoneKey(phone);
  if (!expected) return [];
  return dedupeCandidates(results).filter((candidate) =>
    [candidate.phone, candidate.secondary_phone].some((value) => phoneKey(value) === expected),
  );
}

function resultFromCandidates(
  basis: Exclude<AdmissionGuardianMatchBasis, null>,
  candidates: PersonSearchResult[],
): AdmissionGuardianResolutionResult {
  if (candidates.length === 1) {
    return {
      status: 'unique',
      basis,
      candidates,
      resolution: candidateResolution(candidates[0]),
    };
  }
  return {
    status: candidates.length > 1 ? 'ambiguous' : 'none',
    basis: candidates.length > 0 ? basis : null,
    candidates,
    resolution: candidates.length > 1 ? null : { kind: 'new' },
  };
}

export async function resolveAdmissionGuardianBeforeRegistration(params: {
  prefill: AdmissionPrefill;
  activeSchoolId: number | null;
  limit?: number;
}): Promise<AdmissionGuardianResolutionResult> {
  const guardian = record(params.prefill.guardian);
  const alreadyBoundGuardianId =
    positiveId(params.prefill.guardian_id) ||
    positiveId(params.prefill.guardian_selection?.guardian_id) ||
    positiveId(guardian.guardian_id);
  if (alreadyBoundGuardianId) {
    return {
      status: 'already_bound',
      basis: null,
      candidates: [],
      resolution: { kind: 'guardian', id: alreadyBoundGuardianId },
    };
  }

  const snapshot = extractAdmissionGuardianLookupSnapshot(params.prefill);
  const limit = params.limit ?? 8;

  let identityMatches: PersonSearchResult[] = [];
  if (snapshot.identity) {
    const identityResults = await searchGuardiansGlobally({
      query: snapshot.identity,
      activeSchoolId: params.activeSchoolId,
      limit,
    });
    identityMatches = exactIdentityMatches(snapshot.identity, identityResults);
    if (identityMatches.length === 1) return resultFromCandidates('identity', identityMatches);
  }

  if (snapshot.phone) {
    const phoneResults = await searchGuardiansGlobally({
      query: snapshot.phone,
      activeSchoolId: params.activeSchoolId,
      limit,
    });
    const phoneMatches = exactPhoneMatches(snapshot.phone, phoneResults);

    if (identityMatches.length > 1) {
      const phonePartnerIds = new Set(phoneMatches.map((item) => item.partner_id));
      const intersection = identityMatches.filter((item) => phonePartnerIds.has(item.partner_id));
      if (intersection.length > 0) return resultFromCandidates('identity', intersection);
      return resultFromCandidates('identity', identityMatches);
    }

    if (phoneMatches.length > 0) return resultFromCandidates('phone', phoneMatches);
  }

  if (identityMatches.length > 1) return resultFromCandidates('identity', identityMatches);

  return {
    status: 'none',
    basis: null,
    candidates: [],
    resolution: { kind: 'new' },
  };
}

export function resolutionMatchesCandidate(
  resolution: AdmissionGuardianResolution,
  candidate: PersonSearchResult,
): boolean {
  if (resolution.kind === 'new') return false;
  if (resolution.kind === 'guardian') return candidate.guardian_id === resolution.id;
  return (candidate.person_id ?? candidate.partner_id) === resolution.id;
}
